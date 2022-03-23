import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";
import { BlockObjectRequest,
        AppendBlockChildrenResponse } from "https://deno.land/x/notion_sdk/src/api-endpoints.ts";

import {
    ManipulateSet,
    AppendFromInfo,
    ColorInfo,
    ConvertInfo,
    FormulaInfo,
    ImportInfo,
    NumberingInfo,
    SeparateInfo,
    SortInfo,
    TableRowBlockObject,
    TableRowResponces,
} from "./base_types.ts"

import {
    add_formula_to_table,
    add_formula_to_cell,
    add_row_number,
    change_text_color,
    create_from_text,
    get_lists,
    get_tables_and_rows,
    join_tabels,
    print_table,
    separate_table,
    set_celldata_obj,
    sort_tablerows_by_col,
} from "./functions.ts"


// 各行・列に対して一様に数式評価を行う行・列を追加する
export async function add_formula_row_col(
    notion: Client,
    url: string,
    options: FormulaInfo,
    inspect = false
    ): Promise<AppendBlockChildrenResponse> {
    return await table_manipulations(notion, url, [{"manipulation":"fomula", "options":options}], inspect)
}


// リストの内容をテーブルに追加
export async function append_from_list(
    notion: Client,
    url: string,
    options: AppendFromInfo,
    inspect = false
): Promise<AppendBlockChildrenResponse> {
    return await get_lists(notion, url).then(async (response) => {
        const {texts, table_id} = response

        let additional_rows: Array<TableRowBlockObject>
        // 文字列のリストからテーブル形式へ
        const table_rows = create_from_text(texts, 
            {"separation":options.separation, "row_label":false, "col_label":options.col_label}
        )
        if (options.col_label==false){
            additional_rows = table_rows 
        } else {
            additional_rows = table_rows.slice(1)
        }

        // inspcet == true のときは、リクエストには投げずにそのデータを返す
        if (inspect) {
            const pasedu_table = { "object": 'block', "type": "table", "has_children": true,
                "table": { "table_width": additional_rows[0].table_row.cells.length,
                    "has_column_header": (options.col_label) ? true : false,
                    "has_row_header": false,
                    "children": additional_rows
                }
            } as BlockObjectRequest
            print_table([pasedu_table])
            return Promise.resolve({ "results": [pasedu_table] } as AppendBlockChildrenResponse )
        }

        // 親要素にテーブルを追加
        return await notion.blocks.children.append({
            block_id: table_id,
            children: additional_rows as Array<BlockObjectRequest>
        })
    })
}


// 汎用処理
export async function table_manipulations(
    notion: Client,
    url: string,
    calls: Array<ManipulateSet>,
    inspect = false
    ): Promise<AppendBlockChildrenResponse> {

    // 親要素以下の table block object の id と ヘッダーの設定と元のテーブルの列数を取得する
    return await get_tables_and_rows(notion, url)
    .then(async (response) => {
        // 行データから必要な情報を取り出す
        const org_rowobjs_list: Array<TableRowBlockObject> = response.rowobjs_lists[0]

        // 比較範囲からラベルを排除するため、デフォルト開始セルをヘッダーの有無に合わせて設定
        const default_rowidx = (response.header_info_list[0][0]) ? 1 : 0
        const default_colidx = (response.header_info_list[0][1]) ? 1 : 0

        const table_rows = maltiple_manipulation(response, org_rowobjs_list, default_rowidx, default_colidx, calls)

        // 更新した行データから、table block object を作成する
        const table_props = { "object": 'block', "type": "table", "has_children": true,
            "table": { "table_width": table_rows[0].table_row.cells.length,
                "has_column_header": response.header_info_list[0][0],
                "has_row_header": response.header_info_list[0][1],
                "children": table_rows
            }
        } as BlockObjectRequest
        
        // inspcet == true のときは、リクエストには投げずにそのデータを返す
        if (inspect) {
            print_table([table_props])
            return Promise.resolve({ "results": [table_props] } as AppendBlockChildrenResponse)
        }
        
        // 親要素にテーブルを追加
        return await notion.blocks.children.append({
            block_id: response.parent_id,
            children: [table_props]
        })
    })
}


// 各行・列に対して一様に数式評価を行う行・列を追加する
export async function calculate_formula_cells(
    notion: Client,
    url: string,
    inspect = false
    ): Promise<AppendBlockChildrenResponse> {
    return await table_manipulations(notion, url, [{"manipulation":"calculate", "options":null}], inspect)
}


// 最大値・最小値に色付け
export async function change_maxmin_colored(
    notion: Client,
    url: string,
    options: ColorInfo,
    inspect = false
): Promise<AppendBlockChildrenResponse> {
    return await table_manipulations(notion, url, [{"manipulation":"colored", "options":options}], inspect)
}


// リストをテーブルに変換
export async function conversion_from_list(
    notion: Client,
    url: string,
    options: ConvertInfo,
    inspect = false
): Promise<AppendBlockChildrenResponse> {
    return await get_lists(notion, url).then(async (response) => {
        const {texts, parent_id} = response

        // 文字列のリストからテーブル形式へ
        const table_rows = create_from_text(texts, options)

        const table_props = { "object": 'block', "type": "table", "has_children": true,
            "table": { "table_width": table_rows[0].table_row.cells.length,
                "has_column_header": options.row_label,
                "has_row_header": (options.col_label) ? true : false,
                "children": table_rows
            }
        } as BlockObjectRequest
                
        // inspcet == true のときは、リクエストには投げずにそのデータを返す
        if (inspect) {
            print_table([table_props])
            return Promise.resolve({ "results": [table_props] } as AppendBlockChildrenResponse)
        }

        // 親要素にテーブルを追加
        return await notion.blocks.children.append({
            block_id: parent_id,
            children: [table_props]
        })
    })
}


// テーブルをリストに変換
export async function conversion_to_list(
    notion: Client,
    url: string,
    options: ConvertInfo,
    inspect = false
): Promise<AppendBlockChildrenResponse> {
    return await get_tables_and_rows(notion, url)
    .then(async (response) => {
        // 行データから必要な情報を取り出す
        const org_rowobjs_list: Array<TableRowBlockObject> = response.rowobjs_lists[0]

        // 
        const text_mat = org_rowobjs_list.map(
            row => row.table_row.cells.map(cell => (cell.length) ? cell.map(c => c.plain_text).join() : "" )
        )
        let formatted_text: Array<Array<string>>
        if (options.col_label) {
            const {sep} = options.col_label
            const labels = text_mat[0]
            formatted_text = text_mat.slice(1).map(row => row.map( (t,idx) => labels[idx]+sep+t) )
        } else {
            formatted_text = text_mat
        }

        const list_items = formatted_text.map(row => row.join(options.separation)).map(tx => {
            return {
                "object":"block", "type": "bulleted_list_item",
                "bulleted_list_item":{"rich_text": set_celldata_obj("text", tx)}
            }
        }) as Array<BlockObjectRequest>
        
                
        // inspcet == true のときは、リクエストには投げずにそのデータを返す
        if (inspect) {
            print_table(list_items)
            return Promise.resolve({ "results": list_items } as AppendBlockChildrenResponse)
        }

        // 親要素にテーブルを追加
        return await notion.blocks.children.append({
            block_id: response.parent_id,
            children: list_items
        })
    })
}


// 連続処理
function maltiple_manipulation (
    response: TableRowResponces,
    org_table_rows: Array<TableRowBlockObject>,
    default_rowidx: number,
    default_colidx: number,
    calls: Array<ManipulateSet>
): Array<TableRowBlockObject> {
    // 処理のチェック
    const manipus = calls.map( call => call.manipulation)
    const trans_idx = manipus.findIndex(t => t=="transpose")
    if ( trans_idx != -1 ) {
        if ((manipus.length > 2) && (trans_idx!=0 && trans_idx!=manipus.length-1 )  ) {
            throw new Error("転置は一番最初あるいは一番最後に実行してください")
        }
    }
    
    // 処理
    let table_rows = [...org_table_rows]
    let eval_limit_row = table_rows.length
    let eval_limit_col = response.table_width_list[0]
    const new_def_rowidx = default_rowidx
    let new_def_colidx = default_colidx
    calls.forEach( call => {
        if (call.manipulation == "colored") {
            // テーブルの各行・列について、指定に応じて色を付ける
            table_rows = change_text_color(call.options, new_def_rowidx, new_def_colidx, table_rows, eval_limit_row, eval_limit_col)
        }
        else if (call.manipulation == "fomula") {
            // 各行・列に対して一様に数式評価を行う行・列を追加する
            call.options.formula_list.forEach(info => {
                if (( ["R_MAXNAME","R_MINNAME","R_SECONDMAXNAME","R_SECONDMINNAME"].includes(info.formula) && new_def_rowidx==0) ||
                    ( ["C_MAXNAME","C_MINNAME","C_SECONDMAXNAME","C_SECONDMINNAME"].includes(info.formula) && new_def_colidx==0)) {
                        throw new Error("対応するラベル行・列がない場合、NAME系の formula は使用できません")
                    }
            })
            table_rows = add_formula_to_table(call.options, new_def_rowidx, new_def_colidx, table_rows, eval_limit_row, eval_limit_col)
        }
        else if (call.manipulation =="numbering") {
            // 各行に連番を振る
            if (call.options!==null && call.options!==undefined) {
                table_rows = add_row_number(call.options, table_rows, new_def_rowidx)
            } else {
                const ops: NumberingInfo = {"label":"", "start_number":1, "step":1, "text_format": "{num}"}
                table_rows = add_row_number(ops, table_rows, new_def_rowidx)
            }
            new_def_colidx += 1
            eval_limit_col += 1
        }
        else if (call.manipulation == "sort") {
            // テーブル(の行データ)をソートする
            table_rows = sort_tablerows_by_col(call.options, new_def_rowidx, table_rows, eval_limit_row)
        }
        else if (call.manipulation == "transpose") {
            // テーブル(の行データ)を転置する
            table_rows = [...Array(response.table_width_list[0])].map( (_x, idx) => {
                const new_cells = table_rows.map( row => row.table_row.cells[idx] )
                return {"object":"block", "type":"table_row", "table_row":{"cells": new_cells}}
            } );
            
            [eval_limit_col, eval_limit_row] = [eval_limit_row, eval_limit_col]
        }
        else if (call.manipulation == "calculate") {
            // セルの命令に従い計算
            table_rows = add_formula_to_cell(new_def_rowidx, new_def_colidx, table_rows)
        }
    })
    return table_rows
}



// 指定したパスの csv や json を読み込んでテーブルを作成
export async function table_from_file(
    notion: Client,
    parent_id: string,
    import_info: ImportInfo,
    inspect = false
): Promise<AppendBlockChildrenResponse> {
    const file_name = import_info.path.split("/").reverse()[0]
    if (!file_name.endsWith(".csv")  && !file_name.endsWith(".json")) {
        throw new Error("ファイルが正しく指定されていません")
    }

    return await Deno.readTextFile(import_info.path).then( async (imported_text) => {
        let text_mat: Array<Array<string>> = [[""]]
        if (file_name.endsWith(".csv")) {
            // csv から、テキストの行列を作成
            text_mat = imported_text.split(/\r\n|\n/).map(row => row.split(","))
        
        } else if (file_name.endsWith(".json")) {
            // json から、テキストの行列を作成
            // any を消すため、entries でバラして無理やり string にしてから再度オブジェクト化
            const j_data: Record<string, unknown> = JSON.parse(imported_text)
            const j_data_keys = Object.keys(j_data)

            const row_records = Object.values(j_data).map( (ob, idx) => {
                const new_kvs = Object.entries(ob as Record<string, unknown>).map( ([k,v]) => [k, String(v)] )
                if (import_info.jsonkey_as_cell) {
                    return Object.fromEntries([ ["", j_data_keys[idx]], ...new_kvs ]) as Record<string, string>
                } else {
                    return Object.fromEntries(new_kvs) as Record<string, string>
                }
            })

            // ラベルの一覧を作ってそこから行列を作成
            const labels = [...new Set(row_records.map(rec => Object.keys(rec)).flat())]
            const rows = row_records.map(rec => labels.map(lb => (lb in rec) ? rec[lb] : "") )
            text_mat = [labels].concat(rows)
        }

        // テキストの行列から、rich text を作りつつ行データのリストを作成
        // 今のところ、一律に type="text" で作成
        const table_rows: Array<TableRowBlockObject> = text_mat.map(row => {
            const new_cells = row.map( text => set_celldata_obj("text", text) )
            return {"object":"block", "type":"table_row", "table_row":{"cells": new_cells}}
        })

        // 更新した行データから、table block object を作成する
        const table_props = { "object": 'block', "type": "table", "has_children": true,
            "table": { "table_width": text_mat[0].length,
                "has_column_header": import_info.row_label,
                "has_row_header": import_info.col_label,
                "children": table_rows
            }
        } as BlockObjectRequest
                
        // inspcet == true のときは、リクエストには投げずにそのデータを返す
        if (inspect) {
            print_table([table_props])
            return Promise.resolve({ "results": [table_props] } as AppendBlockChildrenResponse)
        }

        // 親要素にテーブルを追加
        return await notion.blocks.children.append({
            block_id: parent_id,
            children: [table_props]
        })
    })
}


// テーブルを接合
export async function table_joining(
    notion: Client,
    url: string,
    calls?: Array<ManipulateSet> | null,
    inspect = false  
): Promise<AppendBlockChildrenResponse> {

    // 親要素以下の table block object の id と ヘッダーの設定と元のテーブルの列数を取得する
    return await get_tables_and_rows(notion, url)
    .then(async (response) => {
        // 複数テーブルの行データのリストのリストを取得
        const org_rowobjs_lists: Array<Array<TableRowBlockObject>> = response.rowobjs_lists

        // 比較範囲からラベルを排除するため、デフォルト開始セルをヘッダーの有無に合わせて設定
        const default_rowidx = (response.header_info_list[0][0]) ? 1 : 0
        const default_colidx = (response.header_info_list[0][1]) ? 1 : 0

        // 複数テーブルを接合
        let table_rows = join_tabels(org_rowobjs_lists, response.header_info_list, response.table_width_list)

        if (calls!==null && calls!==undefined) {
            const new_response: TableRowResponces = {
                "header_info_list": response.header_info_list,
                "parent_id": response.parent_id,
                "table_id_list": response.table_id_list,
                "table_width_list": [table_rows[0].table_row.cells.length],
                "rowobjs_lists": [table_rows]
            }    
            table_rows = maltiple_manipulation(new_response, table_rows, default_rowidx, default_colidx, calls)
        }

        // 更新した行データから、table block object を作成する
        const table_props = { "object": 'block', "type": "table", "has_children": true,
            "table": { "table_width": table_rows[0].table_row.cells.length,
                "has_column_header": response.header_info_list[0][0],
                "has_row_header": response.header_info_list[0][1],
                "children": table_rows
            }
        } as BlockObjectRequest
        
        // inspcet == true のときは、リクエストには投げずにそのデータを返す
        if (inspect) {
            print_table([table_props])
            return Promise.resolve({ "results": [table_props] } as AppendBlockChildrenResponse)
        }
        
        // 親要素にテーブルを追加
        return await notion.blocks.children.append({
            block_id: response.parent_id,
            children: [table_props]
        })
    })
}


// 各行に連番を振る
export async function table_row_numbering(
    notion: Client,
    url: string,
    options?: NumberingInfo | null,
    inspect = false
): Promise<AppendBlockChildrenResponse> {
    
    if (options === undefined ){
        const num_ops: NumberingInfo = {"label":"", "text_format":"{num}", "start_number": 1, "step": 1}
        return await table_manipulations(notion, url, [{"manipulation":"numbering", "options":num_ops}], inspect)
    } else {
        return await table_manipulations(notion, url, [{"manipulation":"numbering", "options":options}], inspect)
    }
}


// テーブル分割
export async function table_separation (
    notion: Client,
    url: string,
    options: SeparateInfo,
    inspect = false
    ): Promise<AppendBlockChildrenResponse> {
        
    // 親要素以下の table block object の id と ヘッダーの設定と元のテーブルの列数を取得する
    return await get_tables_and_rows(notion, url)
    .then(async (response) => {
        // 行データから必要な情報を取り出す
        const org_rowobjs_list: Array<TableRowBlockObject> = response.rowobjs_lists[0]
        const default_rowidx = (response.header_info_list[0][0]) ? 1 : 0

        // テーブル(の行データ)を複数のリストに分割する
        const tables = separate_table(org_rowobjs_list, options, default_rowidx)

        // それぞれのリストごとに table block object を作る
        const table_props_list = tables.map(lis => {
            return { 
                "object": 'block',
                "type": 'table',
                "table": {
                    "table_width": response.table_width_list[0], // 元のテーブルに合わせる
                    "has_column_header": response.header_info_list[0][0], // 元のテーブルに合わせる
                    "has_row_header": response.header_info_list[0][1], // 元のテーブルに合わせる
                    "children": lis
                }
            }
        }) as Array<BlockObjectRequest>

        // inspcet == true のときは、リクエストには投げずにそのデータを返す
        if (inspect) {
            print_table(table_props_list)
            return Promise.resolve({ "results": table_props_list } as AppendBlockChildrenResponse)
        }
        // 親要素にテーブルを追加
        return await notion.blocks.children.append({
            block_id: response.parent_id,
            children: table_props_list
        })
    })
}


// テーブル並び替え
export async function table_sorting(
    notion: Client,
    url: string,
    options: SortInfo,
    inspect = false
): Promise<AppendBlockChildrenResponse> {
    return await table_manipulations(notion, url, [{"manipulation":"sort", "options":options}], inspect)
}


// テーブル転置
export async function table_transposation(
    notion: Client,
    url: string,
    inspect = false
): Promise<AppendBlockChildrenResponse> {
    return await table_manipulations(notion, url, [{"manipulation":"transpose", "options":null}], inspect)
}