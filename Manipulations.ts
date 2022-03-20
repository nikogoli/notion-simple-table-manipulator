import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";
import { BlockObjectRequest,
        AppendBlockChildrenResponse } from "https://deno.land/x/notion_sdk/src/api-endpoints.ts";

import {
    ColorInfo,
    FormulaInfo,
    ImportInfo,
    NumberingInfo,
    SeparateInfo,
    SortInfo,
    TableRowBlockObject,
} from "./base_types.ts"

import {
    add_formula_to_table,
    add_row_number,
    change_text_color,
    get_tables_and_rows,
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

    // 親要素以下の table block object の id と ヘッダーの設定と元のテーブルの列数を取得する
    return await get_tables_and_rows(notion, url)
    .then(async (response) => {
        // 行データから必要な情報を取り出す
        const org_rowobjs_list: Array<TableRowBlockObject> = response.rowobjs_lists[0]

        // 比較範囲からラベルを排除するため、デフォルト開始セルをヘッダーの有無に合わせて設定
        const default_rowidx = (response.header_info_list[0][0]) ? 1 : 0
        const default_colidx = (response.header_info_list[0][1]) ? 1 : 0

        options.formula_list.forEach(info => {
            if (( ["R_MAXNAME","R_MINNAME","R_SECONDMAXNAME","R_SECONDMINNAME"].includes(info.formula) && default_rowidx==0) ||
                ( ["C_MAXNAME","C_MINNAME","C_SECONDMAXNAME","C_SECONDMINNAME"].includes(info.formula) && default_colidx==0)) {
                    throw new Error("対応するラベル行・列がない場合、NAME系の formula は使用できません")
                }
        })

        let table_width = response.table_width_list[0]
        const table_rows = add_formula_to_table(options, default_rowidx, default_colidx, org_rowobjs_list)
        options.formula_list.forEach(info => {
            if (info.formula.split("_")[0]=="R") { table_width += 1 }
        })

        // 更新した行データから、table block object を作成する
        const table_props = { "object": 'block', "type": "table", "has_children": true,
            "table": { "table_width": table_width,
                "has_column_header": response.header_info_list[0][0],
                "has_row_header": response.header_info_list[0][1],
                "children": table_rows
            }
        } as BlockObjectRequest
        
        // inspcet == true のときは、リクエストには投げずにそのデータを返す
        if (inspect) {
            return Promise.resolve({ "results": [table_props] } as AppendBlockChildrenResponse)
        }
        
        // 親要素にテーブルを追加
        return await notion.blocks.children.append({
            block_id: response.parent_id,
            children: [table_props]
        })
    })
}


// 最大値・最小値に色付け
export async function change_maxmin_colored(
    notion: Client,
    url: string,
    options: ColorInfo,
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

        // テーブルの各行・列について、指定に応じて色を付ける
        const table_rows = change_text_color(options, default_rowidx, default_colidx, org_rowobjs_list)

        // 更新した行データから、table block object を作成する
        const table_props = { "object": 'block', "type": "table", "has_children": true,
            "table": { "table_width": response.table_width_list[0],
                "has_column_header": response.header_info_list[0][0],
                "has_row_header": response.header_info_list[0][1],
                "children": table_rows
            }
        } as BlockObjectRequest
        
        // inspcet == true のときは、リクエストには投げずにそのデータを返す
        if (inspect) {
            return Promise.resolve({ "results": [table_props] } as AppendBlockChildrenResponse)
        }
        
        // 親要素にテーブルを追加
        return await notion.blocks.children.append({
            block_id: response.parent_id,
            children: [table_props]
        })
    })
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
            return Promise.resolve({ "results": [table_props] } as AppendBlockChildrenResponse)
        }

        // 親要素にテーブルを追加
        return await notion.blocks.children.append({
            block_id: parent_id,
            children: [table_props]
        })
    })
}


// 各行に連番を振る
export async function table_row_numbering(
    notion: Client,
    url: string,
    options?: NumberingInfo,
    inspect = false
    ): Promise<AppendBlockChildrenResponse> {

    // 親要素以下の table block object の id と ヘッダーの設定と元のテーブルの列数を取得する
    return await get_tables_and_rows(notion, url)
    .then(async (response) => {
        // 行データから必要な情報を取り出す
        const org_rowobjs_list: Array<TableRowBlockObject> = response.rowobjs_lists[0]

        // テーブル(の行データ)を転置する
        let op: NumberingInfo
        if (options==undefined) {
            op = {"text_format":"{num}"}
        } else {
            op = options
        }
        const table_rows = add_row_number(op, org_rowobjs_list)
        const table_width = response.table_width_list[0] + 1

        // 更新した行データから、table block object を作成する
        const table_props = { "object": 'block', "type": "table", "has_children": true,
            "table": { "table_width": table_width,
                "has_column_header": response.header_info_list[0][0],
                "has_row_header": response.header_info_list[0][1],
                "children": table_rows
            }
        } as BlockObjectRequest
        
        // inspcet == true のときは、リクエストには投げずにそのデータを返す
        if (inspect) {
            return Promise.resolve({ "results": [table_props] } as AppendBlockChildrenResponse)
        }
        
        // 親要素にテーブルを追加
        return await notion.blocks.children.append({
            block_id: response.parent_id,
            children: [table_props]
        })
    })
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

    // 親要素以下の table block object の id と ヘッダーの設定と元のテーブルの列数を取得する
    return await get_tables_and_rows(notion, url)
    .then(async (response) => {
        // 行データから必要な情報を取り出す
        const org_rowobjs_list: Array<TableRowBlockObject> = response.rowobjs_lists[0]

            // 比較範囲からラベルを排除するため、デフォルト開始セルをヘッダーの有無に合わせて設定
        const default_rowidx = (response.header_info_list[0][0]) ? 1 : 0

        // テーブル(の行データ)を並び替える
        const table_rows = sort_tablerows_by_col(options, default_rowidx, org_rowobjs_list)

        // 更新した行データから、table block object を作成する
        const table_props = { "object": 'block', "type": "table", "has_children": true,
            "table": { "table_width": response.table_width_list[0],
                "has_column_header": response.header_info_list[0][0],
                "has_row_header": response.header_info_list[0][1],
                "children": table_rows
            }
        } as BlockObjectRequest
        
        // inspcet == true のときは、リクエストには投げずにそのデータを返す
        if (inspect) {
            return Promise.resolve({ "results": [table_props] } as AppendBlockChildrenResponse)
        }
        
        // 親要素にテーブルを追加
        return await notion.blocks.children.append({
            block_id: response.parent_id,
            children: [table_props]
        })
    })
}


// テーブル転置
export async function table_transposation(
    notion: Client,
    url: string,
    inspect = false
    ): Promise<AppendBlockChildrenResponse> {

    // 親要素以下の table block object の id と ヘッダーの設定と元のテーブルの列数を取得する
    return await get_tables_and_rows(notion, url)
    .then(async (response) => {
        // 行データから必要な情報を取り出す
        const org_rowobjs_list: Array<TableRowBlockObject> = response.rowobjs_lists[0]

        // テーブル(の行データ)を転置する
        const table_rows = [...Array(response.table_width_list[0])].map( (_x, idx) => {
            const new_cells = org_rowobjs_list.map( row => row.table_row.cells[idx] )
            return {"object":"block", "type":"table_row", "table_row":{"cells": new_cells}}
        } )

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
            return Promise.resolve({ "results": [table_props] } as AppendBlockChildrenResponse)
        }
        
        // 親要素にテーブルを追加
        return await notion.blocks.children.append({
            block_id: response.parent_id,
            children: [table_props]
        })
    })
}