import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";
import { BlockObjectRequest,
        AppendBlockChildrenResponse } from "https://deno.land/x/notion_sdk/src/api-endpoints.ts";

import {
    ColorInfo,
    NumberingInfo,
    SeparateInfo,
    SortInfo,
    TableRowBlockObject,
} from "./base_types.ts"

import {
    add_row_number,
    change_text_color,
    get_tables_and_rows,
    separate_table,
    sort_tablerows_by_col,
} from "./functions.ts"


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

        // テーブル(の行データ)を転置する
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


// 各行に連番を振る
export async function table_row_numbering(
    notion: Client,
    url: string,
    options: NumberingInfo,
    inspect = false
    ): Promise<AppendBlockChildrenResponse> {

    // 親要素以下の table block object の id と ヘッダーの設定と元のテーブルの列数を取得する
    return await get_tables_and_rows(notion, url)
    .then(async (response) => {
        // 行データから必要な情報を取り出す
        const org_rowobjs_list: Array<TableRowBlockObject> = response.rowobjs_lists[0]

        // テーブル(の行データ)を転置する
        const table_rows = add_row_number(options, org_rowobjs_list)
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

        // テーブル(の行データ)を転置する
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