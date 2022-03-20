import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";

import { 
    ApiColor,
    BlockObjectResponse,
    PartialBlockObjectResponse,
    RichTextItemResponse,
} from "https://deno.land/x/notion_sdk/src/api-endpoints.ts"

import {
    CellObject,
    ColorInfo,
    FormulaInfo,
    NumberingInfo,
    SeparateInfo,
    SortInfo,
    TableRowBlockObject,
    TableRowResponces,
} from "./base_types.ts"


// 行あるいは列として、特定の数式を評価した結果のセルを追加する
// 数式の設定 + 評価範囲の先頭の行・列のインデックス + 行基準の table block object のリスト → 数式を評価した結果のセルが行・列に追加された table block object
export function add_formula_to_table(
    info: FormulaInfo,
    default_rowidx: number,
    default_colidx: number,
    table_rows: Array<TableRowBlockObject>
): Array<TableRowBlockObject>{

    const cell_mat_by_row = create_cel_matrix("R", table_rows, default_rowidx, default_colidx)
    const cell_mat_by_col = create_cel_matrix("C", table_rows, default_rowidx, default_colidx)
    const table_labels: Record<string, Array<Array<RichTextItemResponse>|[]>> = {
        "row": table_rows[0].table_row.cells,
        "col": table_rows.map(row => row.table_row.cells[0])
    }

    info.formula_list.forEach(info => {
        const [direction, formula] = info.formula.split("_")
        let results_texts : Array< RichTextItemResponse[]> = []
        if (direction=="R"){
            cell_mat_by_row.forEach( (target, r_idx) => {
                const new_text_obj = evaluate_formula("R", formula, target, table_labels)
                table_rows[r_idx+default_rowidx].table_row.cells.push(new_text_obj)
                results_texts.push(new_text_obj)
            })
            if (default_rowidx==1) {table_rows[0].table_row.cells.push(set_celldata_obj("text", info.label))}
        } else if (direction=="C") {
            let new_cells = cell_mat_by_col.map( target => evaluate_formula("C", formula, target, table_labels) )
            results_texts = [...new_cells]
            if (default_colidx==1) { new_cells = [set_celldata_obj("text", info.label), ...new_cells] }
            table_rows.push( {"object":"block", "type":"table_row", "table_row": {"cells":new_cells}} )
        } else {
            throw new Error("formula が不適切です")
        }
        if (info.max || info.min) {
            const sorted = results_texts.sort((a,b) => Number(a[0].plain_text) - Number(b[0].plain_text))
            if (info.max) {
                const max_cells = sorted.filter(item => item[0].plain_text==sorted[sorted.length-1][0].plain_text)
                max_cells.forEach( c => c[0].annotations.color = info.max as ApiColor )
            }
            if (info.min) {
                const max_cells = sorted.filter(item => item[0].plain_text==sorted[0][0].plain_text)
                max_cells.forEach( c => c[0].annotations.color = info.min as ApiColor )
            }
        }
    })
    const max_width = table_rows.map(r => r.table_row.cells.length).sort((a,b) => b - a)[0]
    table_rows.forEach( row => {
        if (row.table_row.cells.length < max_width) {
            [...Array(max_width - row.table_row.cells.length)].map(_x => row.table_row.cells.push(set_celldata_obj("text","")))
        }
    })
    return table_rows
}


// 各行の先頭に、(指定したフォーマットで)上の行から順に番号を振る
// 番号付けの設定 + 行基準の table block object のリスト → ラベル行には空セル、それ以外の行には連番セルを先頭に追加した table block object のリスト
export function add_row_number(
    number_info: NumberingInfo,
    table_rows: Array<TableRowBlockObject>)
: Array<TableRowBlockObject> {
    return  table_rows.map( (item, idx) => {
        if (idx==0) {
            const new_cells = [...[set_celldata_obj("text", "")], ...item.table_row.cells]
            return {"object": "block", "type": item.type, "table_row":{"cells": new_cells}}
        } else {
            const text = (number_info.text_format!="")
                ? number_info.text_format.replace("{num}", String(idx))
                : String(idx)
            const new_cells = [...[set_celldata_obj("text", text)], ...item.table_row.cells]
            return {"object": "block", "type": item.type, "table_row":{"cells": new_cells}}
        }
    })
}


// テーブルの行列構造を元に構築された、「セル+セルの行・列インデックス+セルのテキスト」の行列を作るもの
// 行・列全体に対する数式処理を簡便化するためのもの
// 方向指定(行/列) + 行基準のtable row block のリスト + 情報を取り出す行・列の先頭のインデックス → 指定方向で2次元配列化された CellObject の行列
function create_cel_matrix(
    direction: "R"|"C" ,
    list: Array<TableRowBlockObject>,
    default_rowidx: number,
    default_colidx: number
): Array<Array<CellObject>> {
    let mat: Array<Array<CellObject>>
    if (direction=="R") {
        mat = list.slice(default_rowidx).map(
            (rowobj, r_idx) => rowobj.table_row.cells.slice(default_colidx).map(
                (cell, c_idx) =>{
                    const text = (cell.length) ? cell.map( ({plain_text}) => plain_text).join("") : ""
                    return {cell, "r_idx": r_idx+default_rowidx, "c_idx": c_idx+default_colidx, text}
                }
            )
        )
    } else {
        const c_idxs = [...Array(list[0].table_row.cells.length).keys()].slice(default_colidx)
        mat = c_idxs.map( c_idx => list.slice(default_rowidx).map( (rowobj, r_idx) => {
                const cell = rowobj.table_row.cells[c_idx]
                const text = (cell.length) ? cell.map( c => c.plain_text).join("") : ""
                return {cell, "r_idx": r_idx+default_rowidx, c_idx, text}
            })
        )
    }
    return mat
}


// 最大値・最小値のセルに色付け
// 色付け設定 + 色付け対象の先頭行・列のインデックス + 行基準の table row block のリスト → セル内のテキストを色付けした table row block のリスト
export function change_text_color (
    color_info: ColorInfo,
    default_rowidx: number,
    default_colidx: number,
    table_rows: Array<TableRowBlockObject>
    ) : Array<TableRowBlockObject> {

    const arranged_mat = create_cel_matrix(color_info.direction, table_rows, default_rowidx, default_colidx)

    if (color_info.max!="" || color_info.min!=""){
        arranged_mat.forEach( (targets) => {
            // 評価対象のセルを並び替え、先頭と末尾のテキストを取得し、それと値が等しいセルを取得する (同じ値のセルが複数ある場合に対応)
            const sorted = targets.sort((a,b) => Number(a.text)-Number(b.text))
            const [min_tx, max_tx] = [sorted[0].text, sorted[sorted.length-1].text]            
            const min_cells = targets.filter(item => item.text==min_tx)
            const max_cells = targets.filter(item => item.text==max_tx)

            if (color_info.max!=""){
                max_cells.forEach(c => {
                    if (c.cell.length) {
                        table_rows[c.r_idx].table_row.cells[c.c_idx].forEach(c => c.annotations.color= color_info.max as ApiColor)
                    }
                })
            }
            if (color_info.min!="") {
                min_cells.forEach(c => {
                    if (c.cell.length) {
                        table_rows[c.r_idx].table_row.cells[c.c_idx].forEach(c => c.annotations.color= color_info.min as ApiColor)
                    }
                })
            }
        })
    }
    return table_rows
}


// 具体的な数式の評価処理
// 評価の方向指定 + 数式 + 評価対象のセルのリスト + テーブルの行・列のラベルのセルのレコード → 数式を評価した結果をテキストに持つ rich text object
function evaluate_formula (
    direction: "R"|"C",
    formula:string,
    cells: Array<CellObject>,
    table_labels: Record<string, Array<Array<RichTextItemResponse>|[]>>
    ): Array<RichTextItemResponse>{
    if (formula=="SUM") {
        // 合計
        const new_text = cells.reduce( (pre, now) => pre+Number(now.text), 0 )
        return set_celldata_obj("text", String(new_text))
    } else if (formula=="AVERAGE"){
        // 平均
        const new_text = cells.reduce( (pre, now) => pre+Number(now.text), 0 )/ cells.length
        return set_celldata_obj("text", String(new_text.toFixed(2)))
    } else if (formula=="COUNT") {
        // 数え上げ
        return set_celldata_obj("text", String(cells.length))
    } else if (formula.includes("MAX") || formula.includes("MIN")) {
        // 最大・最小系
        // 計算対象の並べ替え → 1番目と2番目の値を取得
        const ordered_num = [...new Set(cells.map( c => Number(c.text)))].sort( (a,b) => a - b)
        const [first_min, second_min] = [ordered_num[0], ordered_num[1] ]
        const [second_max, first_max] = [ordered_num[ordered_num.length-2], ordered_num[ordered_num.length-1]]

        const lable_cells: Record<string, Array<RichTextItemResponse>|[]> = {"max":[], "second_max":[], "min":[], "second_min":[]}
        // NAME系の命令では、元テーブルのラベル行・列の rich text object を取得する
        if (formula.includes("NAME")) {
            const cells_list = [first_min, second_min, second_max, first_max].map( nm => cells.filter(c => Number(c.text)==nm) )
            const calls = ["min", "second_min", "second_max", "max"]
            calls.forEach( (k, idx) => {
                let labels: Array<Array<RichTextItemResponse>|[]>
                if (direction=="R") {
                    labels = cells_list[idx].map(c => c.c_idx).map(nm => table_labels.row[nm])
                } else {
                    labels = cells_list[idx].map(c => c.r_idx).map(nm => table_labels.col[nm] )
                }
                if (labels.length >1) {
                    const space_inserted = [labels[0] , ...labels.slice(1).map(c => [set_celldata_obj("text", ", "), c]).flat() ]
                    lable_cells[k] = space_inserted.flat()
                } else {
                    lable_cells[k] = labels.flat()
                }
            })
        }
        
        // 普通の命令では、数値から rich text object を作って return する
        if (formula=="MAX") {
            return set_celldata_obj("text", String(first_max))
        } else if (formula=="SECONDMAX") {
            return set_celldata_obj("text", String(second_max))
        } else if (formula=="MIN") {
            return set_celldata_obj("text", String(first_min))
        } else if (formula=="SECONDMIN") {
            return set_celldata_obj("text", String(second_min))
        }// NAME系の命令では、元テーブルのラベル行・列の rich text object をレコードから取り出して returnする
        else if (formula=="MAXNAME") {
            return lable_cells["max"]
        } else if (formula=="SECONDMAXNAME") {
            return lable_cells["second_max"]
        } else if (formula=="MINNAME") {
            return lable_cells["min"]
        } else if (formula=="SECONDMINNAME") {
            return lable_cells["second_min"]
        } else {
            throw new Error("formula が不適切です")
        }
    } else {
        throw new Error("formula が不適切です")
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
    option: SeparateInfo,
    default_rowidx: number
    ): Array<Array<TableRowBlockObject>> {

    let targets: Array<TableRowBlockObject>
    let use_blank = false
    let is_cut: (idx:number, len:number, lbs: Array<string>) => boolean
    if (option.factory) {
        const {count} = option.factory
        if (option.factory.use_sort) {
            targets = sort_tablerows_by_col(option.factory.use_sort, default_rowidx, table_rows)
        } else {
            targets = [...table_rows]
        }
        is_cut = (idx, _len, _lbs) => {return (idx == count+1)}
    } else {
        targets = [...table_rows]
        use_blank = (option.row_labels.length == 0)
        if (use_blank) {
            // 切断の基準：空行、つまり空白セルの数が行の総セル数と等しいかどうか
            const blank_lengths = table_rows.map(row => row.table_row.cells.filter( cell => cell.length==0).length )
            is_cut = (idx, len, _lbs) => {return (len == blank_lengths[idx] )}
        } else if (option.row_labels.length > 0 && option.row_labels[0].length > 0 ) {
            // 切断の基準：切断の設定で指定したラベルの中に、その行のラベルと一致するものがあるかどうか
            const labels =  table_rows.map(row => (row.table_row.cells[0].length) ? row.table_row.cells[0].map(t => t.plain_text).join() : "")
            is_cut = (idx, _len=0, lbs) => {return (lbs.includes(labels[idx]) )}
        } else {
            throw new Error("区切りの設定が不適切です")
        }
    }
    // 元テーブルの行インデックスを複数のリストに分割する
    const rows_groups = targets.slice(1).reduce( (pre, now, idx) => {
        let cut = false
            if  (option.factory) { cut = is_cut(pre[pre.length-1].length, -1, [""]) }
            else if (use_blank) { cut = is_cut(idx+1, now.table_row.cells.length, [""])}
            else { cut = is_cut(idx+1, -1, option.row_labels) }
            // 非カット場所なら行を親リストの末尾のリストに追加、カット場所ならラベル行とその行が入った新しいリストを親の末尾に挿入
            if (cut) {
                pre.push( (use_blank) ? [table_rows[0]] : [table_rows[0], now])
                return pre
            } else {
                pre[pre.length-1].push(now)
                return pre
            }
        }, [[table_rows[0]]] as Array<Array<TableRowBlockObject>>
    )
    if (table_rows.length == 1) {
        throw new Error('区切りが見つかりません。')
    }
    return rows_groups
}


// タイプ + テキスト → セルの内容として使える rich text object あるいは空行列
// 現状では、"text" と "equation" のみに対応し、"mention" は未対応
export function set_celldata_obj(type:"text"|"equation", text:string) : Array<RichTextItemResponse> | []{
    if (text) {
        if (type=="equation") {
            return [{
                "type":"equation", "equation":{"expression": text},
                "plain_text": text, "href": null,
                "annotations": { "bold": false, "italic": false, "strikethrough": false,
                    "underline": false, "code": false, "color": "default" }
            } ]
        } else if (type=="text") {
            return [ {
                "type":"text", "text":{"content": text, "link": null},
                "plain_text": text, "href": null,
                "annotations": { "bold": false, "italic": false, "strikethrough": false,
                    "underline": false, "code": false, "color": "default" }
            } ]
        } else {
            throw new Error("タイプ設定が不適切です")
        }
    } else {
        return []
    }
}


// テーブルの並び替え
// ソート設定 + 並び替え対象の先頭行のインデックス + 行基準の table row block のリスト → 指定列でソートした table row block のリスト
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