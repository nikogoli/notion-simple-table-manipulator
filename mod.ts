import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";
import { BlockObjectResponse,
        PartialBlockObjectResponse,
        RichTextItemResponse } from "https://deno.land/x/notion_sdk/src/api-endpoints.ts"


// get_tables_and_rows の返り値で、親要素に含まれるテーブルとそれらの行データに関する諸々を格納するもの
export interface TableRowResponces {
    parent_id: string
    table_id_list: Array<string>
    header_info_list: Array<Array<boolean>>
    table_width_list: Array<number>
    rowobjs_lists: Array<Array<TableRowBlockObject>>
}


// BlockObjectResponse 型を table object に限定したもの
export interface TableRowBlockObject {
    object: "block"
    table_row: { cells: Array<Array<RichTextItemResponse>|[]> }
    type: "table_row"
}


// テーブル分割の設定をまとめたもの
export interface SeparateInfo {
    labels: Array<string> | []       // 分割の基準となる行ラベルのリスト 指定行の上で切り分ける
// ソートの設定をまとめるもの(暫定) 現状は、列基準のソートのみを想定
export interface SortInfo {
    label: string
    as_int: boolean
    reverse: boolean
}


// ソート設定、ラベル行の有無(1 or 0)、行基準の table row block のリストを入れると、指定列でソートした table block object を吐き出す
export function sort_tablerows_by_col(
    info: SortInfo,
    default_rowidx: number,
    table_rows: Array<TableRowBlockObject>
        ) :Array<TableRowBlockObject> {

    if (info.label=="") {return table_rows}

    // 指定列の存在をチェック
    const labels = table_rows[0].table_row.cells.map(cell => (cell.length) ? cell.map(c=>c.plain_text).join() : "")
    const col_idx = labels.findIndex(lb => lb == info.label)
    if (col_idx <0) {
        throw new Error("テーブル内に、ソート基準に指定した列名が存在しません")
    }

    const records = table_rows.slice(1).map( (row, r_idx) => {
        const cell = row.table_row.cells[col_idx]
        if (cell.length) {
            return { "text":cell.map(c => c.plain_text).join(), "r_idx": r_idx+1}
        } else {
            return {"text":"", "r_idx": r_idx+1}
        }
    })

    let sorted = [...records]
    if (info.as_int) {
        sorted = records.sort((a,b) => (a.text < b.text) ? -1 : 1)            
    } else {
        sorted = records.slice(default_rowidx).sort((a,b) => Number(a.text) -Number(b.text))
    }
    if (info.reverse) {sorted.reverse()}

    // ソートされた行番号の順に行を呼ぶことで、行データを並び替える
    if (default_rowidx==1) {
        return  [table_rows[0]].concat(sorted.map( ({r_idx}) => table_rows[r_idx] ))
    } else {
        return  sorted.map( ({r_idx}) => table_rows[r_idx] )
    }
}


// 親要素を指定し、そこに含まれるテーブルに関する情報を取得する
// 親要素を含んだURL → 親要素のid、子要素であるテーブルのid・ヘッダー情報・テーブル幅・行データそれぞれのリスト
export async function get_tables_and_rows(notion:Client, url:string): Promise<TableRowResponces> {
    const table_id_list: Array<string> = []
    const header_info_list: Array<Array<boolean>> = []
    const table_width_list: Array<number> = []
    const results_list: Array<Array<PartialBlockObjectResponse|BlockObjectResponse>> = []
    let parent_id = ""

    if (!url.startsWith("https://")) {
        parent_id = url
    } else {
        const matched = url.match(/so\/(.+)#(.+)/)
        if (!matched) {throw new Error("URLのパースに失敗しました")}
        parent_id = matched[2]
    }

    return await notion.blocks.children.list({ block_id: parent_id }).then( async (response) => {
        // 親要素以下の table block object の id と ヘッダーの設定と元のテーブルの列数を取得する
        response.results.forEach(item => {
            if ("type" in item) {
                if (item.type=="table") {
                    table_id_list.push(item.id)
                    header_info_list.push([item.table.has_column_header, item.table.has_row_header])
                    table_width_list.push(item.table.table_width)
                }
            }
        })
        if (!table_id_list.length) {throw new Error("子要素にテーブルが見つかりません")}
    
        return await table_id_list.reduce((promise, id) => {
            return promise.then(async () => {
                await notion.blocks.children.list({ block_id:id }).then(
                    (response) =>  results_list.push(response.results)
                )
            })
        }, Promise.resolve() )
    }).then(  () => {
        // 行データから必要な情報を取り出す
        const rowobjs_lists: Array<Array<TableRowBlockObject>> = results_list.map(
            list => list.map(item => {
                if ( "type" in item && "table_row" in item ) {
                    const {type, table_row} = item
                    return {"object": "block" as const, type, table_row}
                } else {
                    throw new Error("response.results_list 内の行データにおいて、type あるいは table_row がないものが存在します")
                }
            })
        )
        return {parent_id, table_id_list, header_info_list, table_width_list, rowobjs_lists}
    })
}



// テーブルの分割処理
// table row block のリスト + 処理の設定 → 分割された複数の table row block のリスト
export function separate_table(
    table_rows: Array<TableRowBlockObject>,
    option: SeparateInfo
    ): Array<Array<TableRowBlockObject>> {

    const use_blank = (option.labels.length == 0)
    let to_cut = false
    let idx_groups: Array<Array<number>> = [[]]
    // 元テーブルの行インデックスを複数のリストに分割する
    table_rows.forEach( (row, idx) => {
        // 切断の基準：すべてのセルが空白の行
        if ( use_blank ) {
            const blanks = row.table_row.cells.filter( cell => cell.length==0)
            to_cut = (blanks.length == row.table_row.cells.length)
        // 切断の基準：ラベルが指定と同じ行
        } else if (option.labels.length > 0 && option.labels[0].length > 0 ) {
            const cell = row.table_row.cells[0]
            const label = (cell.length) ?  cell.map(t => t.plain_text).join() : ""
            to_cut = (option.labels as Array<string> ).includes(label)
        } else {
            throw new Error("区切りの設定が不適切です")
        }
        // 非カット場所なら idx をリストに追加、カット場所なら新しいリストを挿入してそこに idx に追加
        if (to_cut) {
            idx_groups.push([])
            idx_groups[idx_groups.length-1].push(idx)
        } else {
            idx_groups[idx_groups.length-1].push(idx)
        }
    })
    if (idx_groups.length == 1) {
        throw new Error('区切りが見つかりません。')
    }
    // 空白行で切るときは、切り分けたリストの先頭にある空白行を排除する
    if (use_blank) {
        idx_groups = [...idx_groups.slice(0, -1).map(gp => gp.slice(1)), idx_groups[idx_groups.length-1] ]
    }

    // 行インデックスのリストに従って table row block object のリストを分割し、1番目以外のリストの頭にラベル行を追加する
    const rows_groups = idx_groups.map( (groups, idx) => {
        if (idx!=0) {
            return [table_rows[0]].concat(groups.map(nm => table_rows[nm] ))
        } else {
            return groups.map(nm => table_rows[nm] )
        }
    })    
    return rows_groups
}