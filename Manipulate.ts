import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";
import { BlockObjectRequest,
        AppendBlockChildrenResponse } from "https://deno.land/x/notion_sdk/src/api-endpoints.ts";

import {
    ManipulateSet,
    ColorInfo,
    ConvertFromInfo,
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
    add_row_number,
    change_text_color,
    create_from_text,
    get_lists,
    get_tables_and_rows,
    join_tabels,
    separate_table,
    set_celldata_obj,
    sort_tablerows_by_col,
} from "./functions.ts"


export interface ApiInformations {
    client: Client
    url: string
}


export interface GenericCall {
    calls : Array<ManipulateSet>
    inspect? : boolean
}


export class TableManipulator {
    notion : Client
    url : string
    block_id: string

    public constructor(info: ApiInformations) {
        this.notion = info.client
        this.url = info.url
        if (!info.url.startsWith("https://")) {
            this.block_id = info.url
        } else {
            const matched = info.url.match(/so\/(.+)#(.+)/)
            if (!matched) {throw new Error("URLのパースに失敗しました")}
            this.block_id = matched[2]
        }
    }

    public readonly notion_with_id = {
        blocks : {
            retrieve : ( () => {return this.notion.blocks.retrieve({"block_id":this.block_id})})
        }
    }

    public async table_manipulations(
        {   calls,
            inspect }: GenericCall
    ): Promise<AppendBlockChildrenResponse> {
    
        // 親要素以下の table block object の id と ヘッダーの設定と元のテーブルの列数を取得する
        return await get_tables_and_rows(this.notion, this.url)
        .then(async (response) => {
            // 行データから必要な情報を取り出す
            const org_rowobjs_list: Array<TableRowBlockObject> = response.rowobjs_lists[0]
    
            // 比較範囲からラベルを排除するため、デフォルト開始セルをヘッダーの有無に合わせて設定
            const default_rowidx = (response.header_info_list[0][0]) ? 1 : 0
            const default_colidx = (response.header_info_list[0][1]) ? 1 : 0
    
            const table_rows = this.#maltiple_manipulation(response, org_rowobjs_list, default_rowidx, default_colidx, calls)
    
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
            return await this.notion.blocks.children.append({
                block_id: response.parent_id,
                children: [table_props]
            })
        })
    }

    #maltiple_manipulation (
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
        })
        return table_rows
    }
}