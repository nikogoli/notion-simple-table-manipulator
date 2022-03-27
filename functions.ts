import { 
    ApiColor,
    BlockObjectRequest,
    RichTextItemResponse,
} from "https://deno.land/x/notion_sdk/src/api-endpoints.ts"

import {
    ApplyColorOptions,
    CellObject,
    ConvertFromOptions,
    FormulaOptions,
    NumberingOptions,
    SeparateOptions,
    SortOptions,
    TableProps,
    TableRowBlockObject,
} from "./base_types.ts"


// 行あるいは列として、特定の数式を評価した結果のセルを追加する
// 数式の設定 + 評価範囲の先頭の行・列のインデックス + 行基準の table block object のリスト → 数式を評価した結果のセルが行・列に追加された table block object
export function add_formula_to_table(
    formula_list: Array<FormulaOptions>,
    default_rowidx: number,
    default_colidx: number,
    table_rows: Array<TableRowBlockObject>,
    limit_rowidx = -1,
    limit_colidx = -1
): Array<TableRowBlockObject>{

    formula_list.forEach(call => {
        if (( ["R_MAXNAME","R_MINNAME","R_SECONDMAXNAME","R_SECONDMINNAME"].includes(call.formula) && default_rowidx==0) ||
            ( ["C_MAXNAME","C_MINNAME","C_SECONDMAXNAME","C_SECONDMINNAME"].includes(call.formula) && default_colidx==0)) {
                throw new Error("対応するラベル行・列がない場合、NAME系の formula は使用できません")
            }
    })

    const limit_r = (limit_rowidx < 0) ? table_rows.length : limit_rowidx
    const limit_l = (limit_colidx < 0) ? table_rows[0].table_row.cells.length : limit_colidx
    
    const cell_mat_by_row = create_cel_matrix("R", table_rows, default_rowidx, default_colidx, limit_r, limit_l)
    const cell_mat_by_col = create_cel_matrix("C", table_rows, default_rowidx, default_colidx, limit_r, limit_l)
    const cells_in_header: Record<"row"|"col", Array<Array<RichTextItemResponse>|[]>> = {
        "row": table_rows[0].table_row.cells,
        "col": table_rows.map(row => row.table_row.cells[0])
    }

    formula_list.forEach(info => {
        const [direction, formula] = info.formula.split("_")
        const label = info.label ?? formula
        const {valid_row_idx, valid_col_idx} = get_valid_indices(table_rows, info, cells_in_header)

        let results_texts : Array< RichTextItemResponse[]> = []
        if (direction=="R"){
            cell_mat_by_row.forEach( (target, r_idx) => {
                if (valid_row_idx.includes(target[0].r_idx)) {
                    const cells = target.filter(c => valid_col_idx.includes(c.c_idx))
                    const new_text_obj = evaluate_formula("R", formula, cells, cells_in_header)
                    table_rows[r_idx+default_rowidx].table_row.cells.push(new_text_obj)
                    results_texts.push(new_text_obj)
                }
            })
            if (default_rowidx>0) {table_rows[0].table_row.cells.push(set_celldata_obj("text", label))}
        } else if (direction=="C") {
            let new_cells = cell_mat_by_col.map( target => {
                if (valid_col_idx.includes(target[0].c_idx)){
                    const cells = target.filter(c => valid_row_idx.includes(c.r_idx))
                    return evaluate_formula("C", formula, cells, cells_in_header)    
                } else {
                    return set_celldata_obj("text", "")
                }
            })
            results_texts = [...new_cells]
            if (default_colidx > 0) {
                if (default_colidx > 1) {
                    const blank_cells = [...Array(default_colidx-1)].map(_x => set_celldata_obj("text",""))
                    new_cells = [set_celldata_obj("text", label), ...blank_cells, ...new_cells] 
                } else {
                    new_cells = [set_celldata_obj("text", label), ...new_cells] 
                }
            }
            table_rows.push( {"object":"block", "type":"table_row", "table_row": {"cells":new_cells}} )
        } else {
            throw new Error("formula が不適切です")
        }
        if (info.max || info.min) {
            const notemp_cells = results_texts.filter(c => c.length > 0)
            const sorted = notemp_cells.sort((a,b) => Number(a[0].plain_text) - Number(b[0].plain_text))
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
            let calucued_text = text.slice(1)
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
                    const evaled = eval(calucued_text)
                    if (typeof evaled != "number") { throw new Error() }
                    const new_num = (Number.isInteger(evaled)) ? String(evaled) : evaled.toFixed(2)
                    table_rows[r_idx].table_row.cells[c_idx] = set_celldata_obj("text", new_num)
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
    number_info: NumberingOptions,
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
    options: ConvertFromOptions
): Array<TableRowBlockObject> {
    let table_rows: Array<TableRowBlockObject>
    if (options.label_separation_by !== undefined){
        // ラベル+セルのテキストの場合、セルごとに切り分けてレコードを作る
        const sep = options.label_separation_by
        const row_records: Array<Record<string, string>> = texts.map( tx =>{
            return Object.fromEntries( tx.split(options.cell_separation_by).map( t => {
                const splited = t.split(sep)
                return (splited.length > 1) ? splited : ["", ...splited]
            } ) )
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
        const row_cells_list = texts.map(tx => tx.split(options.cell_separation_by).map(t => set_celldata_obj("text", t)) )
        table_rows = row_cells_list.map(cells => {
            return {"object":"block", "type":"table_row", "table_row":{"cells":cells}}
        })
    }
    return table_rows
}


// 最大値・最小値のセルに色付け
// 色付け設定 + 色付け対象の先頭行・列のインデックス + 行基準の table row block のリスト → セル内のテキストを色付けした table row block のリスト
export function change_text_color (
    color_info: ApplyColorOptions,
    default_rowidx: number,
    default_colidx: number,
    table_rows: Array<TableRowBlockObject>,
    limit_rowidx = -1,
    limit_colidx = -1
    ) : Array<TableRowBlockObject> {

    const limit_r = (limit_rowidx < 0) ? table_rows.length : limit_rowidx
    const limit_l = (limit_colidx < 0) ? table_rows[0].table_row.cells.length : limit_colidx
     const cells_in_header: Record<"row"|"col", Array<Array<RichTextItemResponse>|[]>> = {
        "row": table_rows[0].table_row.cells,
        "col": table_rows.map(row => row.table_row.cells[0])
    }   
    const arranged_mat = create_cel_matrix(color_info.direction, table_rows, default_rowidx, default_colidx, limit_r, limit_l)

    const {valid_col_idx, valid_row_idx} = get_valid_indices(table_rows, color_info, cells_in_header)

    if (color_info.max==undefined || color_info.min!==undefined){
        arranged_mat.forEach( (targets) => {
            // 評価対象のセルを並び替え、先頭と末尾のテキストを取得し、それと値が等しいセルを取得する (同じ値のセルが複数ある場合に対応)
            if ((color_info.direction=="R" && valid_row_idx.includes(targets[0].r_idx) ) ||
                (color_info.direction=="C" && valid_col_idx.includes(targets[0].c_idx) ))
            {
                const cells = (color_info.direction=="R")
                    ? targets.filter(c => valid_col_idx.includes(c.c_idx))
                    : targets.filter(c => valid_row_idx.includes(c.r_idx))
                const sorted = cells.sort((a,b) => Number(a.text)-Number(b.text))
                const [min_tx, max_tx] = [sorted[0].text, sorted[sorted.length-1].text]            
                const min_cells = cells.filter(item => item.text==min_tx)
                const max_cells = cells.filter(item => item.text==max_tx)

                cells.forEach(c => {
                    if (color_info.max!==undefined && max_cells.includes(c) && c.cell.length){
                        table_rows[c.r_idx].table_row.cells[c.c_idx].forEach(c => c.annotations.color= color_info.max as ApiColor)
                    }
                    else if (color_info.min!==undefined && min_cells.includes(c) && c.cell.length){
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
    cells_in_header: Record<"row"|"col", Array<Array<RichTextItemResponse>|[]>>
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
                    labels = cells_list[idx].map(c => c.c_idx).map(nm => cells_in_header.col[nm])
                } else {
                    labels = cells_list[idx].map(c => c.r_idx).map(nm => cells_in_header.row[nm] )
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


// 範囲指定の設定から、評価対象として適正な列あるいは行のインデックスのリストを作る
// ラベル判定用の行データのリスト + 範囲指定を含んだオプションオブジェクト → インデックスのリスト
function get_valid_indices(
    table_rows: Array<TableRowBlockObject>,
    options: ApplyColorOptions | FormulaOptions,
    cells_in_header: Record<"row"|"col", Array<Array<RichTextItemResponse>|[]>>
): Record<"valid_row_idx"|"valid_col_idx", Array<number>>{

    const is_num_array = function(v:Array<unknown>): v is Array<number> {
        return typeof v[0] === "number"
    }
    const evaluate_validity = function(
        list: Array<string>|Array<number>|undefined,
        base: Array<number>,
        look_at: "cols"|"rows"
    ): Array<number> {
        if (list === undefined) { return base }
        if (is_num_array(list)) {
            const filtered = base.filter(i => !list.includes(i))
            return (filtered.length) ? filtered : base
        } else {
            const str_base = (look_at =="rows")
                    ? cells_in_header.col.map(c => (c.length) ? c.map(t=>t.plain_text).join() : "" )
                    : cells_in_header.row.map(c => (c.length) ? c.map(t=>t.plain_text).join() : "" )
            const filtered = base.filter(idx => !list.includes(str_base[idx]) )
            return (filtered.length) ? filtered : base
        }
   }

   const is_row = ("direction" in options) ? (options.direction =="R") : (options.formula.split("_")[0] == "R")
   const [invalid_row, invalid_col] = (is_row) ? [options.not_apply_to, options.ignore] : [options.ignore, options.not_apply_to]

   const base_col_idxs = [...Array(table_rows[0].table_row.cells.length).keys()]
   const base_row_idxs = [...Array(table_rows.length).keys()]
   const valid_row_idx = evaluate_validity(invalid_row, base_row_idxs, "rows")
   const valid_col_idx = evaluate_validity(invalid_col, base_col_idxs, "cols")
   return {valid_row_idx, valid_col_idx}
}



// 結合
// テーブルごとの行データ + ヘッダー設定 + テーブル幅 → 結合されたテーブル扱いの行データのリスト
//      全てのテーブルにラベル行がないとき、テーブルはそのまま結合される
//      ラベル行があるものと無いものが混合しているとき、ラベル行がないテーブルはその1つ上に位置するテーブルに合わせて結合される
//      テーブル間に異なるラベル列がある場合も許容し、各行で元のテーブルにない部分は空セルで埋める
export function join_tabels(
    tablerows_lists: Array<Array<TableRowBlockObject>>,
    tableinfo_list: Array<TableProps>
) :Array<TableRowBlockObject> {

    let new_rows: Array<Array<Array<RichTextItemResponse>|[]>>
    if (! tableinfo_list.map( info => info.has_column_header ).includes(true)) {
        new_rows = tablerows_lists.map(lis => lis.map(row => row.table_row.cells)).flat()
    } else if (tableinfo_list.map( info => info.has_column_header ).includes(true) && tableinfo_list[0].has_column_header==false) {
        throw new Error("ラベル行を持つ行列が少なくとも1つある場合、一番上に位置する行列はラベル行を持つものにしてください")
    } else {
        type CellRecord = Record<string, Array<RichTextItemResponse>|[]>
        const label_record_list: Array<CellRecord> = []
        const row_records_list: Array<Array<CellRecord>> = []
        tablerows_lists.forEach( (table_rows, idx) => {
            const {has_column_header} = tableinfo_list[idx]
            let label_rec: CellRecord
            let rows = table_rows
            if (has_column_header) {
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
        if (unique_labels.length == tableinfo_list[0].table_width) {
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


// データを console.table() する 
//      引数は、テーブルのリスト or リストアイテムのリストで、前者は行データをオブジェクト化してテーブルごとに.table()
//      後者はそのまま string のリストにして .table()する
export function print_table(
    data: Array<BlockObjectRequest>
): void {
    const texts = data.map(d => {
        if ("table" in d){
            const text_matrix = (d.table.children as Array<TableRowBlockObject>).map(row => {
                return row.table_row.cells.map(
                    cell => (cell.length) ? cell.map(t => t.plain_text).join() : " "
                )
            })
            if (d.table.has_column_header) {
                return text_matrix.slice(1).map( row => Object.fromEntries(row.map( (tx, idx) =>  [text_matrix[0][idx], tx])) )
            } else {
                return text_matrix.map( row => Object.fromEntries(row.map( (tx, idx) =>  [String(idx), tx])) )
            }
        } else if ("bulleted_list_item" in d){
            return (d.bulleted_list_item.rich_text as RichTextItemResponse[]|[]).map( t => t.plain_text).join()
        } else {
            throw new Error("not matched")
        }
    })
    if (typeof texts[0] =="string") { console.table(texts)}
    else { texts.forEach(lis => console.table(lis)) }
}


// テーブルの分割処理
// table row block のリスト + 処理の設定 → 分割された複数の table row block のリスト
export function separate_table(
    table_rows: Array<TableRowBlockObject>,
    options: SeparateOptions,
    default_rowidx: number
    ): Array<Array<TableRowBlockObject>> {

    let is_cut: Array<boolean>
    if (options.method == "by_number") {
        // 0始まりのインデックスが number で割り切れたとき、その行の上で分割する
        const {number} = options.options
        is_cut = (default_rowidx==0) ? [...Array(table_rows.length).keys()].map(i => (i==0) ? false : i%number==0)
                : [false, ...[...Array(table_rows.length-1).keys()].map(i => (i==0) ? false : i%number==0)]
    } else if (options.method == "by_blank") {
        // 空白セルの数が行の総セル数と等しいとき、その行の上で分割する
        const table_width = table_rows[0].table_row.cells.length
        const blank_cells = table_rows.map(
            row => row.table_row.cells.filter( cell => cell.length==0).length
        )
        is_cut = blank_cells.map(i => i==table_width)
    } else if (options.method == "by_labels") {
        // 指定したラベルと一致するラベルであるとき、その行の上で分割する
        const all_labels =  table_rows.map(
            r => (r.table_row.cells[0].length) ? r.table_row.cells[0].map(t => t.plain_text).join() : ""
        )
        is_cut = all_labels.map( lb => options.options.row_labels.includes(lb) )
    }
    // 元テーブルの行インデックスを複数のリストに分割する
    const rows_groups = table_rows.slice(default_rowidx).reduce( (pre, now, idx) => {
        // 非カット場所なら行を親リストの末尾のリストに追加、カット場所ならラベル行とその行が入った新しいリストを親の末尾に挿入
            if (is_cut[idx+default_rowidx] == true) {
                pre.push( (options.method =="by_blank")
                    ? (default_rowidx==0) ? [] : [table_rows[0]]
                    : (default_rowidx==0) ? [now] : [table_rows[0], now]
                )
                return pre
            } else {
                pre[pre.length-1].push(now)
                return pre
            }
        },
        (default_rowidx!=0) ? [ [table_rows[0]] ] : [[]] as Array<Array<TableRowBlockObject>>
    )
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
    info: SortOptions,
    default_rowidx: number,
    table_rows: Array<TableRowBlockObject>,
    limit_rowidx = table_rows.length
) :Array<TableRowBlockObject> {

    if (info.label=="") { throw new Error("ソート基準の列名の指定がありません") }

    // 指定列の存在をチェック
    const labels = table_rows[0].table_row.cells.map(cell => (cell.length) ? cell.map(c=>c.plain_text).join() : "")
    const col_idx = labels.findIndex(lb => lb == info.label)
    if (col_idx <0) {
        throw new Error("テーブル内に、ソート基準に指定した列名が存在しません")
    }

    const records = table_rows.slice(default_rowidx, limit_rowidx).map( (row, r_idx) => {
        const cell = row.table_row.cells[col_idx]
        if (cell.length) {
            return { "text":cell.map(c => c.plain_text).join(), "r_idx": r_idx+1}
        } else {
            return {"text":"", "r_idx": r_idx+default_rowidx}
        }
    })

    let sorted = [...records]
    if (info.as_int !== undefined && info.as_int == false) {
        sorted = records.sort((a,b) => (a.text < b.text) ? -1 : 1)            
    } else {
        sorted = records.sort((a,b) => Number(a.text) -Number(b.text))
    }
    if (info.high_to_low === undefined || info.high_to_low == true) { sorted.reverse() }

    // ソートされた行番号の順に行を呼ぶことで、行データを並び替える
    if (default_rowidx==1) {
        return  [...[table_rows[0]].concat(sorted.map( ({r_idx}) => table_rows[r_idx] )), ...table_rows.slice(limit_rowidx)]
    } else {
        return  [...sorted.map( ({r_idx}) => table_rows[r_idx] ), ...table_rows.slice(limit_rowidx)]
    }
}