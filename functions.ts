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
    ConvertInfo,
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
    table_rows: Array<TableRowBlockObject>,
    limit_rowidx = -1,
    limit_colidx = -1
): Array<TableRowBlockObject>{

    const limit_r = (limit_rowidx < 0) ? table_rows.length : limit_rowidx
    const limit_l = (limit_colidx < 0) ? table_rows[0].table_row.cells.length : limit_colidx
    
    const cell_mat_by_row = create_cel_matrix("R", table_rows, default_rowidx, default_colidx, limit_r, limit_l)
    const cell_mat_by_col = create_cel_matrix("C", table_rows, default_rowidx, default_colidx, limit_r, limit_l)
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
            if (default_colidx > 0) {
                if (default_colidx > 1) {
                    const blank_cells = [...Array(default_colidx-1)].map(_x => set_celldata_obj("text",""))
                    new_cells = [set_celldata_obj("text", info.label), ...blank_cells, ...new_cells] 
                } else {
                    new_cells = [set_celldata_obj("text", info.label), ...new_cells] 
                }
            }
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


// 特定の数式を評価した結果のセルを追加する
// 数式の設定 + 評価範囲の先頭の行・列のインデックス + 行基準の table block object のリスト → 数式を評価した結果のセルが行・列に追加された table block object
export function add_formula_to_cell(
    default_rowidx: number,
    default_colidx: number,
    table_rows: Array<TableRowBlockObject>,
): Array<TableRowBlockObject>{

    const table_labels: Record<string, Array<Array<RichTextItemResponse>|[]>> = {
        "row": table_rows[0].table_row.cells,
        "col": table_rows.map(row => row.table_row.cells[0])
    }
    const text_matrix = table_rows.map( row => row.table_row.cells.map(
        cell => (cell.length) ? cell.map( ({plain_text}) => plain_text).join("") : "" )
    )

    text_matrix.forEach( (row, r_idx) => row.map( (text, c_idx) => {
        // 命令の処理
        if ( text!="" && text.startsWith("=")){       
            let calucued_text = text
            let is_call_only = false
            // 命令文のパース：方向指定文字(C/R)、命令、範囲を示す数字(あるいは空文字列)を取り出す
            const matched = text.match(/([CR])_([^\d\s]+)\((.*)\)/)
            if (matched) {
                // パースが成功 (命令文が存在する)
                const [full_call, direction, formula, idxs] = matched
                is_call_only = (text.length == full_call.length+1)

                // 評価範囲のセルのリストを作成
                let targets: Array<CellObject>
                if (direction=="R" && idxs == "" ){
                    const base_cells = table_rows[r_idx].table_row.cells.slice(default_colidx, c_idx)
                    targets = base_cells.map( (cell, idx) => {
                        const text = text_matrix[r_idx][idx+default_colidx]
                        return {"cell":cell, r_idx, "c_idx":idx+default_colidx, text}
                    })
                } else if (direction=="R" && idxs != "") {
                    const [start, end] = idxs.split(",").map(tx => Number(tx))
                    const base_cells = table_rows[r_idx].table_row.cells.slice(start, end+1)
                    targets = base_cells.map( (c, idx) => {
                        const text = text_matrix[r_idx][idx+start]
                        return {"cell":c, r_idx, "c_idx":idx+start, text}
                    })
                } else if (direction == "C" && idxs == "") {
                    const base_cells = table_rows.slice(default_rowidx, r_idx).map( r => r.table_row.cells[c_idx])
                    targets = base_cells.map( (c, idx) => {
                        const text = text_matrix[idx+default_rowidx][c_idx]
                        return {"cell":c, "r_idx":idx+default_rowidx, c_idx, text} }
                    )
                } else if (direction == "C" && idxs != "") {
                    const [start, end] = idxs.split(",").map(tx => Number(tx))
                    const base_cells = table_rows.slice(start, end+1).map( r => r.table_row.cells[c_idx])
                    targets = base_cells.map( (c, idx) => {
                        const text = text_matrix[idx+start][c_idx]
                        return {"cell":c, "r_idx":idx+start, c_idx, text} }
                    )
                } else {
                    throw new Error("formula が不適切です")
                }
                // 計算結果を得て、元の行列と text_mat の当該セルの中身を差し替える
                const caluc_text_obj = evaluate_formula(direction, formula, targets, table_labels)
                table_rows[r_idx].table_row.cells[c_idx] = caluc_text_obj
                
                calucued_text = text.slice(1).replace(full_call, caluc_text_obj[0].plain_text)
                text_matrix[r_idx][c_idx] = calucued_text
            }
            
            if (!is_call_only){
                // セル指定( R2 や C11 など)を取り出し、指定しているセルの内容に置き換える
                const specified_cells = calucued_text.match(/[RC]\d+/g)
                if (specified_cells !== null) {
                    specified_cells.forEach(speci => {
                        (speci[0]=="R")
                            ? calucued_text = calucued_text.replace(speci, text_matrix[Number(speci.slice(1))][c_idx])
                            : calucued_text = calucued_text.replace(speci, text_matrix[r_idx][Number(speci.slice(1))])
                        }
                    )
                }
                    
                // 四則演算なら eval してその結果を挿入  四則演算と評価できないなら eval せずにfail message を挿入
                if (!calucued_text.match(/[^\d\+\-\*/\(\)\.]/g)) {
                    const new_num = eval(calucued_text).toFixed(2)
                    table_rows[r_idx].table_row.cells[c_idx] = set_celldata_obj("text", String(new_num))
                    text_matrix[r_idx][c_idx] = new_num
                } else {
                    table_rows[r_idx].table_row.cells[c_idx] = set_celldata_obj("text", "不適切な数式")
                    text_matrix[r_idx][c_idx] = "不適切な数式"
                }
            }
        }
    }) )
    return table_rows
}


// 各行の先頭に、(指定したフォーマットで)上の行から順に番号を振る
// 番号付けの設定 + 行基準の table block object のリスト → ラベル行には空セル、それ以外の行には連番セルを先頭に追加した table block object のリスト
export function add_row_number(
    number_info: NumberingInfo,
    table_rows: Array<TableRowBlockObject>,
    default_rowidx: number
)
: Array<TableRowBlockObject> {
    const label = (number_info.label) ? number_info.label : ""
    const step = (number_info.step) ? number_info.step : 1
    const start = (number_info.start_number) ? number_info.start_number : 1
    const text = (number_info.text_format) ? number_info.text_format : "{num}"
    return  table_rows.map( (item, idx) => {
        if (idx == default_rowidx-1) {
            const new_cells = [...[set_celldata_obj("text", label)], ...item.table_row.cells]
            return {"object": "block", "type": item.type, "table_row":{"cells": new_cells}}
        } else {
            const cell_text = text.replace("{num}", String(start+(idx-default_rowidx)*step ))
            const new_cells = [...[set_celldata_obj("text", cell_text)], ...item.table_row.cells]
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
    default_colidx: number,
    limit_rowidx: number,
    limit_colidx: number
): Array<Array<CellObject>> {
    let mat: Array<Array<CellObject>>
    if (direction=="R") {
        mat = list.slice(default_rowidx, limit_rowidx).map(
            (rowobj, r_idx) => rowobj.table_row.cells.slice(default_colidx, limit_colidx).map(
                (cell, c_idx) =>{
                    const text = (cell.length) ? cell.map( ({plain_text}) => plain_text).join("") : ""
                    return {cell, "r_idx": r_idx+default_rowidx, "c_idx": c_idx+default_colidx, text}
                }
            )
        )
    } else {
        const c_idxs = [...Array(list[0].table_row.cells.length).keys()].slice(default_colidx, limit_colidx)
        mat = c_idxs.map( c_idx => list.slice(default_rowidx, limit_rowidx).map( (rowobj, r_idx) => {
                const cell = rowobj.table_row.cells[c_idx]
                const text = (cell.length) ? cell.map( c => c.plain_text).join("") : ""
                return {cell, "r_idx": r_idx+default_rowidx, c_idx, text}
            })
        )
    }
    return mat
}


// 文字列から(必要なら)ラベル部分の切り出しを行い、レコードを経由して table row block のリストを作成
// 文字列のリスト + 切り分けの設定 → table row block のリスト
export function create_from_text(
    texts: Array<string>,
    options: ConvertInfo
): Array<TableRowBlockObject> {
    let table_rows: Array<TableRowBlockObject>
    if (options.col_label){
        // ラベル+セルのテキストの場合、セルごとに切り分けてレコードを作る
        const sep = options.col_label.sep
        const row_records: Array<Record<string, string>> = texts.map( tx =>{
            return Object.fromEntries( tx.split(options.separation).map( t => t.split(sep) ) )
        })

        // ラベル行とセル行をそれぞれ作り、table row block としてまとめる
        const unique_labels = [...new Set(row_records.map(rec => Object.keys(rec)).flat())]
        const row_cells_list = row_records.map(rec => unique_labels.map(lb => {
               return (lb in rec) ? set_celldata_obj("text", rec[lb])  : set_celldata_obj("text", "")
            })
        )
        const header_row_cells = unique_labels.map(lb => set_celldata_obj("text", lb))
        table_rows = [header_row_cells, ...row_cells_list].map(cells => {
            return {"object":"block", "type":"table_row", "table_row":{"cells":cells}}
        })
    } else {
        // セルのテキストのみの場合、そのままセルを作り、そのまま table row block を作る
        const row_cells_list = texts.map(tx => tx.split(options.separation).map(t => set_celldata_obj("text", t)) )
        table_rows = row_cells_list.map(cells => {
            return {"object":"block", "type":"table_row", "table_row":{"cells":cells}}
        })
    }
    return table_rows
}


// 最大値・最小値のセルに色付け
// 色付け設定 + 色付け対象の先頭行・列のインデックス + 行基準の table row block のリスト → セル内のテキストを色付けした table row block のリスト
export function change_text_color (
    color_info: ColorInfo,
    default_rowidx: number,
    default_colidx: number,
    table_rows: Array<TableRowBlockObject>,
    limit_rowidx = -1,
    limit_colidx = -1
    ) : Array<TableRowBlockObject> {

    const limit_r = (limit_rowidx < 0) ? table_rows.length : limit_rowidx
    const limit_l = (limit_colidx < 0) ? table_rows[0].table_row.cells.length : limit_colidx
    const arranged_mat = create_cel_matrix(color_info.direction, table_rows, default_rowidx, default_colidx, limit_r, limit_l)

    const valid_idxs = get_valid_indices(table_rows, color_info)

    if (color_info.max!="" || color_info.min!=""){
        arranged_mat.forEach( (targets) => {
            // 評価対象のセルを並び替え、先頭と末尾のテキストを取得し、それと値が等しいセルを取得する (同じ値のセルが複数ある場合に対応)
            if ((color_info.direction=="R" && valid_idxs.includes(targets[0].r_idx) ) ||
                (color_info.direction=="C" && valid_idxs.includes(targets[0].c_idx) ))
            {   
                const sorted = targets.sort((a,b) => Number(a.text)-Number(b.text))
                const [min_tx, max_tx] = [sorted[0].text, sorted[sorted.length-1].text]            
                const min_cells = targets.filter(item => item.text==min_tx)
                const max_cells = targets.filter(item => item.text==max_tx)

                targets.forEach(c => {
                    if (color_info.max!="" && max_cells.includes(c) && c.cell.length){
                        table_rows[c.r_idx].table_row.cells[c.c_idx].forEach(c => c.annotations.color= color_info.max as ApiColor)
                    }
                    else if (color_info.min!="" && min_cells.includes(c) && c.cell.length){
                        table_rows[c.r_idx].table_row.cells[c.c_idx].forEach(c => c.annotations.color= color_info.min as ApiColor)
                    }
                    else if (c.cell.length){
                        table_rows[c.r_idx].table_row.cells[c.c_idx].forEach(c => c.annotations.color= "default")
                    }
                })
            }
        } )
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


// 親要素を指定し、そこに含まれるリストのデータを取得する
// 親要素を含んだURL → 親要素のid、子要素であるリスト要素のidのリスト・リスト要素のテキストのリスト
export async function get_lists(
    notion:Client,
    url:string
): Promise<{"texts_ids":Array<string>, "texts":Array<string>, "parent_id":string, "table_id":string}> {
    let parent_id: string
    if (!url.startsWith("https://")) {
        parent_id = url
    } else {
        const matched = url.match(/so\/(.+)#(.+)/)
        if (!matched) {throw new Error("URLのパースに失敗しました")}
        parent_id = matched[2]
    }
    return await notion.blocks.children.list({ block_id: parent_id }).then( (response) => {
        // 親要素以下の リスト要素を取得する
        const texts: Array<string> = []
        const texts_ids: Array<string> = []
        let table_id =""
        response.results.forEach(item => {
            if ("type" in item) {
                if (item.type=="bulleted_list_item") {
                    texts_ids.push(item.id)
                    texts.push(item.bulleted_list_item.rich_text.map(t => t.plain_text).join())
                } else if (item.type=="numbered_list_item" ){
                    texts_ids.push(item.id)
                    texts.push(item.numbered_list_item.rich_text.map(t => t.plain_text).join())
                } else if (item.type=="table" ) {
                    table_id = item.id
                }
            }
        })
        if (!texts_ids.length) {throw new Error("子要素にリストブロックが見つかりません")}
        return {texts_ids, texts, parent_id, table_id}
    })
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


// 範囲指定の設定から、評価対象として適正な列あるいは行のインデックスのリストを作る
// ラベル判定用の行データのリスト + 範囲指定を含んだオプションオブジェクト → インデックスのリスト
function get_valid_indices(
    table_rows: Array<TableRowBlockObject>,
    options: ColorInfo | CallInfo
): Array<number>{
    let valid_idxs: Array<number> = []
    const labels_for_r = table_rows.map(r => (r.table_row.cells[0].length) ? r.table_row.cells[0].map(t => t.plain_text).join() : "" )
    const labels_for_l = table_rows[0].table_row.cells.map(c => (c.length) ? c.map(t => t.plain_text).join() : "" )
    if (options.targets == "all") {
        if (options.excludes){
            if (typeof(options.excludes[0]) == "number") {
                valid_idxs = [...Array(table_rows[0].table_row.cells.length).keys()]
                valid_idxs = valid_idxs.filter(i => !(options.excludes as Array<number>).includes(i))
            } else {
                let base: Array<string>
                if ("direction" in options) {
                    base = (options.direction =="R") ? labels_for_r : labels_for_l
                } else {
                    base = (options.formula.split("_")[0] == "R")  ? labels_for_r : labels_for_l
                }
                base.forEach((lb, idx) => {
                    if (!((options.excludes as Array<string>).includes(lb))) { valid_idxs.push(idx) }
                })
            }
        } else {
            valid_idxs = [...Array(table_rows[0].table_row.cells.length).keys()]
        }
    } else {
        if (options.excludes) { throw new Error('targets が"all"以外のときは、excludes の指定はできません') }
        if (typeof(options.targets[0]) == "number") {
            valid_idxs = options.targets as Array<number>
        } else {
            let base: Array<string>
            if ("direction" in options) {
                base = (options.direction =="R") ? labels_for_r : labels_for_l
            } else {
                base = (options.formula.split("_")[0] == "R")  ? labels_for_r : labels_for_l
            }
            base.forEach((lb, idx) => {
                if ((options.targets as Array<string>).includes(lb)) { valid_idxs.push(idx) }
            })
        }
    }
    return valid_idxs
}



// 結合
// テーブルごとの行データ + ヘッダー設定 + テーブル幅 → 結合されたテーブル扱いの行データのリスト
//      全てのテーブルにラベル行がないとき、テーブルはそのまま結合される
//      ラベル行があるものと無いものが混合しているとき、ラベル行がないテーブルはその1つ上に位置するテーブルに合わせて結合される
//      テーブル間に異なるラベル列がある場合も許容し、各行で元のテーブルにない部分は空セルで埋める
export function join_tabels(
    table_rows_lists: Array<Array<TableRowBlockObject>>,
    header_info_list: Array<Array<boolean>>,
    table_width_list: Array<number>
) :Array<TableRowBlockObject> {

    let new_rows: Array<Array<Array<RichTextItemResponse>|[]>>
    if (! header_info_list.map( rowcol => rowcol[0] ).includes(true)) {
        new_rows = table_rows_lists.map(lis => lis.map(row => row.table_row.cells)).flat()
    } else if (header_info_list.map( rowcol => rowcol[0] ).includes(true) && header_info_list[0][0]==false) {
        throw new Error("ラベル行を持つ行列が少なくとも1つある場合、一番上に位置する行列はラベル行を持つものにしてください")
    } else {
        type CellRecord = Record<string, Array<RichTextItemResponse>|[]>
        const label_record_list: Array<CellRecord> = []
        const row_records_list: Array<Array<CellRecord>> = []
        table_rows_lists.forEach( (table_rows, idx) => {
            const header_info = header_info_list[idx]
            let label_rec: CellRecord
            let rows = table_rows
            if (header_info[0]==true) {
                label_rec = Object.fromEntries(table_rows[0].table_row.cells.map( 
                    c => (c.length) ? [c.map(t => t.plain_text).join(), c] : ["", c]
                ))
                label_record_list.push(label_rec)
                rows = table_rows.slice(1)
            } else {
                label_rec = label_record_list[label_record_list.length-1]
            }
            const labels = [...Object.keys(label_rec)]
            const row_records: Array<CellRecord> = rows.map(
                row => Object.fromEntries( row.table_row.cells.map( (cell, idx) => [labels[idx], cell] ) )
            )
            row_records_list.push( row_records )
        })

        const unique_labels = [...new Set( label_record_list.map(rec => [...Object.keys(rec)]).flat() )]
        let header_row : Array<[] | Array<RichTextItemResponse>>
        let body_rows : Array<Array<Array<RichTextItemResponse>>>
        if (unique_labels.length == table_width_list[0]) {
            header_row = unique_labels.map( lb => label_record_list[0][lb])
            body_rows = row_records_list.flat().map(rec => unique_labels.map(lb => rec[lb]))
        } else {
            const new_label_record: CellRecord = Object.fromEntries(label_record_list.map(rec => Object.entries(rec)).flat())
            header_row =  unique_labels.map(lb => new_label_record[lb])
            body_rows = row_records_list.flat().map(rec => unique_labels.map(lb => {
                return (lb in rec) ? rec[lb] : set_celldata_obj("text","")
            }) )
        }
        new_rows = [header_row, ...body_rows]
    }
    return new_rows.map(row => {
        return {"object":"block", "type":"table_row", "table_row": {"cells":row}} as TableRowBlockObject
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
    table_rows: Array<TableRowBlockObject>,
    limit_rowidx = table_rows.length
) :Array<TableRowBlockObject> {

    if (info.label=="") {return table_rows}

    // 指定列の存在をチェック
    const labels = table_rows[0].table_row.cells.map(cell => (cell.length) ? cell.map(c=>c.plain_text).join() : "")
    const col_idx = labels.findIndex(lb => lb == info.label)
    if (col_idx <0) {
        throw new Error("テーブル内に、ソート基準に指定した列名が存在しません")
    }

    const records = table_rows.slice(1, limit_rowidx).map( (row, r_idx) => {
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
        return  [...[table_rows[0]].concat(sorted.map( ({r_idx}) => table_rows[r_idx] )), ...table_rows.slice(limit_rowidx)]
    } else {
        return  [...sorted.map( ({r_idx}) => table_rows[r_idx] ), ...table_rows.slice(limit_rowidx)]
    }
}