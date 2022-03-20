import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";
import { BlockObjectRequest,
        AppendBlockChildrenResponse } from "https://deno.land/x/notion_sdk/src/api-endpoints.ts";

import { TableRowBlockObject,
        SeparateInfo,
        get_tables_and_rows,
        separate_table } from "./mod.ts"


// テーブル分割
export async function table_separation (
    notion: Client,
    url: string,
    option: SeparateInfo,
    inspect = false
    ): Promise<AppendBlockChildrenResponse> {
        
    // 親要素以下の table block object の id と ヘッダーの設定と元のテーブルの列数を取得する
    return await get_tables_and_rows(notion, url)
    .then(async (response) => {
        // 行データから必要な情報を取り出す
        const org_rowobjs_list: Array<TableRowBlockObject> = response.rowobjs_lists[0]
        const default_rowidx = (response.header_info_list[0][0]) ? 1 : 0

        // テーブル(の行データ)を複数のリストに分割する
        const tables = separate_table(org_rowobjs_list, option, default_rowidx)

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
