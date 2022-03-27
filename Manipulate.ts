import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";
import {
        AppendBlockChildrenParameters,
        AppendBlockChildrenResponse,
        BlockObjectResponse,
        BlockObjectRequest,
        CreateDatabaseParameters,
        CreatePageParameters,
        GetPagePropertyParameters,
        ListBlockChildrenParameters,
        UpdateBlockParameters,
        UpdateDatabaseParameters,
        UpdatePageParameters,
        PartialBlockObjectResponse,
        QueryDatabaseParameters,
} from "https://deno.land/x/notion_sdk/src/api-endpoints.ts";

import {
    AppendFromOptions,
    ApplyColorOptions,
    BasicFormula,
    ConvertFromOptions,
    ConvertToOptions,
    DirectedMultiFormulaOptions,
    FormulaCall,
    FormulaOptions,
    ImportOptions,
    ManipulateSet,
    NumberingOptions,
    NonDirectedMultiFormulaOptions,
    SeparateOptions,
    SingleFormulaOptions,
    SortOptions,
    TableProps,
    TableResponse,
    TableRowBlockObject,
} from "./base_types.ts"

import {
    add_formula_to_cell,
    add_formula_to_table,
    add_row_number,
    change_text_color,
    create_from_text,
    join_tabels,
    print_table,
    separate_table,
    set_celldata_obj,
    sort_tablerows_by_col,
} from "./functions.ts"


export interface ApiInformations {
    client: Client
    url: string
    keep_table?: boolean
}


type WithoutId<P> =  Omit<P, "block_id" | "database_id" | "page_id"> 


export class TableManipulator {

    public readonly props = {
        notion : new Client(),
        url : "",
        block_id: "",
        keep_table: false,
    }


    public constructor(info: ApiInformations) {
        this.props.notion = info.client
        this.props.url = info.url
        if (!info.url.startsWith("https://")) {
            this.props.block_id = info.url
        } else {
            const matched = info.url.match(/[\w]{32}/g)
            if (!matched) {throw new Error("URLのパースに失敗しました")}
            this.props.block_id = matched[matched.length-1]
        }
        if (info.keep_table !== undefined && info.keep_table == true) { this.props.keep_table = true }
        else { this.props.keep_table = false }
        //console.log(`Block Id : "${this.props.block_id}"`)
    }


    public readonly notion_with_id = {
        blocks : {
            retrieve : (() => {
                return this.props.notion.blocks.retrieve({"block_id":this.props.block_id})
            } ),
            update : ( ( args: WithoutId<UpdateBlockParameters> ) => {
                return this.props.notion.blocks.update({"block_id":this.props.block_id, ...args})
            } ),
            delete : ( ( ) => { 
                return this.props.notion.blocks.delete({"block_id":this.props.block_id})
            } ),
            children : {
                append: ( ( args: WithoutId<AppendBlockChildrenParameters>) => {
                    return this.props.notion.blocks.children.append({"block_id":this.props.block_id, ...args})
                } ),
                list: (  (args?: WithoutId<ListBlockChildrenParameters>)  => {
                    return this.props.notion.blocks.children.list({"block_id":this.props.block_id, ...args})
                } )
            }
        },
        databases: {
            retrieve : ( ( ) => {
                return this.props.notion.databases.retrieve({"database_id":this.props.block_id})
            } ),
            query : ( (args: WithoutId<QueryDatabaseParameters>) => {
                return this.props.notion.databases.query({"database_id":this.props.block_id, ...args})
            } ),
            create : ( ( args: Omit<CreateDatabaseParameters, "parent">) => {
                return this.props.notion.databases.create({"parent": {"type":"page_id", "page_id":this.props.block_id}, ...args})
            }),
            update : ( ( args: WithoutId<UpdateDatabaseParameters>) => {
                return this.props.notion.databases.update({"database_id":this.props.block_id, ...args})
            } )
        },
        pages: {
            create_in_page: ( ( args: Omit<CreatePageParameters, "parent"> ) => {
                return this.props.notion.pages.create(
                    { "parent": {"page_id":this.props.block_id, "type":"page_id" }, ...args }
                )
            }),
            retrieve : ( ( ) => {
                return this.props.notion.pages.retrieve( {"page_id":this.props.block_id} )
            }),
            update : ( ( args: WithoutId<UpdatePageParameters>) => {
                return this.props.notion.pages.update({"page_id":this.props.block_id, ...args})
            }),
            properties : {
                retrieve : ( ( args: WithoutId<GetPagePropertyParameters>) => {
                    return this.props.notion.pages.properties.retrieve({"page_id":this.props.block_id, ...args})
                })
            }
        }
    }


    public async add_number(
        options: NumberingOptions = { "label":"", "text_format":"{num}", "start_number": 1, "step": 1},
        basic_options?: {delete?:boolean, inspect?:boolean}
    ): Promise<AppendBlockChildrenResponse> {
        return await this.multi_processing([ {"func":"add_number", "options":options} ], basic_options)
    }


    public async add_row_from_list(
        options: AppendFromOptions,
        basic_options?: {delete?:boolean, inspect?:boolean}
    ): Promise<AppendBlockChildrenResponse> {
        return await this.#get_lists().then(async (response) => {
            const {texts, table_id, texts_ids} = response
            const {cell_separation_by, label_separation_by} = options

            // 文字列のリストからテーブル形式へ
            const table_rows = create_from_text(texts,
                {cell_separation_by, label_separation_by, "use_header_row":true, "use_header_col":(label_separation_by===undefined)}
            )
            const additional_rows = (label_separation_by===undefined) ? table_rows : table_rows.slice(1)

            return await this.#append_or_inspect(additional_rows, texts_ids, basic_options, table_id)
        })
    }


    public readonly apply_color = {
        maxmin : ( async ( 
                options: ApplyColorOptions,
                basic_options?: {delete?:boolean, inspect?:boolean}
            ): Promise<AppendBlockChildrenResponse> => {
                return await this.multi_processing( [ {"func":"apply_color", "options":options} ], basic_options)
            })
        //if : (() => {})
    }


    public readonly calculate_table = {
        sum: ( async (
                formula_call: SingleFormulaOptions,
                basic_options?: {delete?:boolean, inspect?:boolean}
            ) => {
                const {append, label, not_apply_to, max, min } = formula_call
                return await this.#add_formula({"calls":["SUM"], append, "labels":[label ?? "Sum"], not_apply_to, max, min}, basic_options)
            }),

        average: ( async (
                formula_call: SingleFormulaOptions,
                basic_options?: {delete?:boolean, inspect?:boolean}
            ) => {
                const {append, label, not_apply_to, max, min } = formula_call
                return await this.#add_formula({"calls":["AVERAGE"], append, "labels":[label ?? "Average"], not_apply_to, max, min}, basic_options)
            }),

        count: ( async (
                formula_call: SingleFormulaOptions,
                basic_options?: {delete?:boolean, inspect?:boolean}
            ) => {
                const {append, label, not_apply_to, max, min } = formula_call
                return await this.#add_formula({"calls":["COUNT"], append, "labels":[label ?? "Count"], not_apply_to, max, min}, basic_options)
            }),
        
        max: ( async (
                formula_call: SingleFormulaOptions,
                basic_options?: {delete?:boolean, inspect?:boolean}
            ) => {
                const {append, label, not_apply_to, max, min } = formula_call
                return await this.#add_formula({"calls":["MAX"], append, "labels":[label ?? "Max"], not_apply_to, max, min}, basic_options)
            }),

        second_max: ( async (
                formula_call: SingleFormulaOptions,
                basic_options?: {delete?:boolean, inspect?:boolean}
            ) => {
                const {append, label, not_apply_to, max, min } = formula_call
                return await this.#add_formula({"calls":["SECONDMAX"], append, "labels":[label ?? "2nd Max"], not_apply_to, max, min}, basic_options)
            }),

        max_name: ( async (
                formula_call: SingleFormulaOptions,
                basic_options?: {delete?:boolean, inspect?:boolean}
            ) => {
                const {append, label, not_apply_to, max, min } = formula_call
                return await this.#add_formula({"calls":["MAXNAME"], append, "labels":[label ?? "Max(name)"], not_apply_to, max, min}, basic_options)
            }),

        second_max_name: ( async (
                formula_call: SingleFormulaOptions,
                basic_options?: {delete?:boolean, inspect?:boolean}
            ) => {
                const {append, label, not_apply_to, max, min } = formula_call
                return await this.#add_formula({"calls":["SECONDMAXNAME"], append, "labels":[label ?? "2nd Max(name)"], not_apply_to, max, min}, basic_options)
            }),

        min: ( async (
                formula_call: SingleFormulaOptions,
                basic_options?: {delete?:boolean, inspect?:boolean}
            ) => {
                const {append, label, not_apply_to, max, min } = formula_call
                return await this.#add_formula({"calls":["MIN"], append, "labels":[label ?? "Min"], not_apply_to, max, min}, basic_options)
            }),

        second_min: ( async (
                formula_call: SingleFormulaOptions,
                basic_options?: {delete?:boolean, inspect?:boolean}
            ) => {
                const {append, label, not_apply_to, max, min } = formula_call
                return await this.#add_formula({"calls":["SECONDMIN"], append, "labels":[label ?? "2nd Min"], not_apply_to, max, min}, basic_options)
            }),

        min_name: ( async (
                formula_call: SingleFormulaOptions,
                basic_options?: {delete?:boolean, inspect?:boolean}
            ) => {
                const {append, label, not_apply_to, max, min } = formula_call
                return await this.#add_formula({"calls":["MINNAME"], append, "labels":[label ?? "Min(name)"], not_apply_to, max, min}, basic_options)
            }),

        second_min_name: ( async (
                formula_call: SingleFormulaOptions,
                basic_options?: {delete?:boolean, inspect?:boolean}
            ) => {
                const {append, label, not_apply_to, max, min } = formula_call
                return await this.#add_formula({"calls":["SECONDMINNAME"], append, "labels":[label ?? "2nd Min(name)"], not_apply_to, max, min}, basic_options)
            }),

        multiple : ( async (
                formula_calls: Array<DirectedMultiFormulaOptions>,
                basic_options?: {delete?:boolean, inspect?:boolean}
            ) => { return await this.#add_formula_multi(formula_calls, basic_options) }),
        
        multiple_col : ( async (
                formula_call: NonDirectedMultiFormulaOptions,
                basic_options?: {delete?:boolean, inspect?:boolean}
            ) => { return await this.#add_formula({"append":"newColumn", ...formula_call}, basic_options) }),
        
        multimple_row : ( async (
            formula_call: NonDirectedMultiFormulaOptions,
                basic_options?: {delete?:boolean, inspect?:boolean}
            ) => { return await this.#add_formula({"append":"newRow", ...formula_call}, basic_options) }),
    }


    public async join(
        joint_options? : {calls: Array<ManipulateSet>},
        basic_options?: {delete?:boolean, inspect?:boolean}
    ): Promise<AppendBlockChildrenResponse> {
    
        // 親要素以下の table block object の id と ヘッダーの設定と元のテーブルの列数を取得する
        return await this.#get_tables_and_rows()
        .then(async (response) => {
            // 行データから必要な情報を取り出す
            const org_rowobjs_lists = response.tablerows_lists
    
            // 比較範囲からラベルを排除するため、デフォルト開始セルをヘッダーの有無に合わせて設定
            const {has_row_header, has_column_header} = response.tableinfo_list[0]
            const default_rowidx = (has_column_header) ? 1 : 0
            const default_colidx = (has_row_header) ? 1 : 0
    
            // 複数テーブルを接合
            let table_rows = join_tabels(org_rowobjs_lists, response.tableinfo_list)
    
            if (joint_options!==undefined && joint_options.calls.length > 0) {
                const new_info_list = response.tableinfo_list.map( info => {
                    const copied = {...info}
                    copied.table_width = table_rows[0].table_row.cells.length
                    return copied
                })
                const new_response: TableResponse = {
                    "tablerows_lists": [table_rows],
                    "tableinfo_list": new_info_list
                };
                ({ table_rows } = this.#maltiple_manipulation(new_response, table_rows, default_rowidx, default_colidx, joint_options.calls))
            }
    
            // 更新した行データから、table block object を作成する
            const table_props = { "object": 'block', "type": "table", "has_children": true,
                "table": { "table_width": table_rows[0].table_row.cells.length,
                    "has_column_header": has_column_header,
                    "has_row_header": has_row_header,
                    "children": table_rows
                }
            } as BlockObjectRequest
            
            return await this.#append_or_inspect([table_props], response.tableinfo_list.map(l=>l.id), basic_options )
        })
    }


    public async multi_processing(
        calls : Array<ManipulateSet>,
        basic_options?: {delete?:boolean, inspect?:boolean}
    ): Promise<AppendBlockChildrenResponse> {
        // 親要素以下の table block object の id と ヘッダーの設定と元のテーブルの列数を取得する
        return await this.#get_tables_and_rows()
        .then(async (response) => {
            // 行データから必要な情報を取り出す
            const org_rowobjs_list: Array<TableRowBlockObject> = response.tablerows_lists[0]
    
            // 比較範囲からラベルを排除するため、デフォルト開始セルをヘッダーの有無に合わせて設定
            const {has_row_header, has_column_header} = response.tableinfo_list[0]
            const default_rowidx = (has_column_header) ? 1 : 0
            const default_colidx = (has_row_header) ? 1 : 0
    
            const { table_rows, new_def_rowidx, new_def_colidx } = this.#maltiple_manipulation(response, org_rowobjs_list, default_rowidx, default_colidx, calls)
            const table_width = table_rows[0].table_row.cells.length
    
            // 更新した行データから、table block object を作成する
            const table_props = { "object": 'block', "type": "table", "has_children": true,
                "table": { "table_width": table_width,
                    "has_column_header": (new_def_rowidx>0),
                    "has_row_header": (new_def_colidx>0),
                    "children": table_rows
                }
            } as BlockObjectRequest
            
            return await this.#append_or_inspect([table_props], response.tableinfo_list.map(l=>l.id), basic_options)
        })
    }


    public async separate(
        options: SeparateOptions,
        basic_options?: {delete?:boolean, inspect?:boolean}
    ): Promise<AppendBlockChildrenResponse> {
            
        // 親要素以下の table block object の id と ヘッダーの設定と元のテーブルの列数を取得する
        return await this.#get_tables_and_rows()
        .then(async (response) => {
            // 行データから必要な情報を取り出す
            const org_rowobjs_list: Array<TableRowBlockObject> = response.tablerows_lists[0]
            const default_rowidx = (response.tableinfo_list[0].has_column_header) ? 1 : 0

            // テーブル(の行データ)を複数のリストに分割する
            const tables = separate_table(org_rowobjs_list, options, default_rowidx)

            // それぞれのリストごとに table block object を作る
            const table_props_list = tables.map(rows => {
                return { 
                    "object": 'block',
                    "type": 'table',
                    "table": { // 設定は元のテーブルに合わせる
                        "table_width": response.tableinfo_list[0].table_width, 
                        "has_column_header": response.tableinfo_list[0].has_column_header, 
                        "has_row_header": response.tableinfo_list[0].has_row_header, 
                        "children": rows
                    }
                }
            }) as Array<BlockObjectRequest>

            return await this.#append_or_inspect( table_props_list, response.tableinfo_list.map(l=>l.id), basic_options)
        })
    }


    public async sort(
        options: SortOptions,
        basic_options?: {delete?:boolean, inspect?:boolean}
): Promise<AppendBlockChildrenResponse> {
    return await this.multi_processing( [ {"func":"sort", "options":options} ], basic_options )
}


    public async transpose(
        basic_options?: {delete?:boolean, inspect?:boolean}
    ): Promise<AppendBlockChildrenResponse> {
        return await this.multi_processing( [ {"func":"transpose", "options":null} ], basic_options )
    }


    public async calculate_cell(
        basic_options?: {delete?:boolean, inspect?:boolean}
    ): Promise<AppendBlockChildrenResponse> {
        return await this.multi_processing( [{"func":"calculate_cell", "options":null}], basic_options )
    }


    public readonly convert ={
        to_list : ( async (
            options: ConvertToOptions,
            basic_options?: {delete?:boolean, inspect?:boolean}
        ): Promise<AppendBlockChildrenResponse> =>  {
            return await this.#get_tables_and_rows()
            .then(async (response) => {
                // 行データから必要な情報を取り出す
                const org_rowobjs_list: Array<TableRowBlockObject> = response.tablerows_lists[0]

                // セルのテキストの行列を作成
                const text_mat = org_rowobjs_list.map(
                    row => row.table_row.cells.map(cell => (cell.length) ? cell.map(c => c.plain_text).join() : "" )
                )
                let formatted_text: Array<Array<string>>
                if (options.label_separation_by) {
                    const sep = options.label_separation_by
                    const labels = text_mat[0]
                    formatted_text = text_mat.slice(1).map(row => row.map( (t,idx) => labels[idx]+sep+t) )
                } else {
                    formatted_text = text_mat
                }

                const list_items = formatted_text.map(row => row.join(options.cell_separation_by)).map(tx => {
                    return {
                        "object":"block", "type": "bulleted_list_item",
                        "bulleted_list_item":{"rich_text": set_celldata_obj("text", tx)}
                    }
                }) as Array<BlockObjectRequest>
                
                return await this.#append_or_inspect(list_items, response.tableinfo_list.map(l=>l.id), basic_options )
            })
        }),

        from_list : ( async (
            options: ConvertFromOptions,
            basic_options?: {delete?:boolean, inspect?:boolean}
        ): Promise<AppendBlockChildrenResponse> => {
            return await this.#get_lists().then(async (response) => {
                const {texts} = response
        
                // 文字列のリストからテーブル形式へ
                const table_rows = create_from_text(texts, options)
        
                const table_props = { "object": 'block', "type": "table", "has_children": true,
                    "table": { "table_width": table_rows[0].table_row.cells.length,
                        "has_column_header": options.use_header_row ,
                        "has_row_header": options.use_header_col,
                        "children": table_rows
                    }
                } as BlockObjectRequest
                        
                return await this.#append_or_inspect([table_props], response.texts_ids, basic_options )
            })
        })
    }


    public async from_file(
        import_info: ImportOptions,
        basic_options?: {delete?:boolean, inspect?:boolean}
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
                    if (import_info.jsonkey_as_cell!==undefined && import_info.jsonkey_as_cell == true) {
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
                    "has_column_header": import_info.set_header_row,
                    "has_row_header": import_info.set_header_colmun,
                    "children": table_rows
                }
            } as BlockObjectRequest
            
            return await this.#append_or_inspect([table_props], null, basic_options )
        })
    }


    async #append_or_inspect(
        data_list: Array<BlockObjectRequest>|Array<TableRowBlockObject>,
        id_list: Array<string> | null,
        basic_options?: {delete?:boolean, inspect?:boolean},
        target_id?: string
    ): Promise<AppendBlockChildrenResponse> {
        const id = target_id ?? this.props.block_id

        const is_tablerow_array = function(
            v:Array<BlockObjectRequest>|Array<TableRowBlockObject>
        ): v is Array<TableRowBlockObject> {
            return v[0].type == "table_row"
        }
        const append_and_end = ( async () => {
            // 親要素にテーブルを追加して終了
            return await this.props.notion.blocks.children.append({
                block_id: id,
                children: data_list as Array<BlockObjectRequest>
            })
        })
        const print_and_end = (() => {
            let tables: Array<BlockObjectRequest>
            if (is_tablerow_array(data_list)) {
                const pasedu_table = { "object": 'block', "type": "table", "has_children": true,
                    "table": { "table_width": data_list[0].table_row.cells.length,
                        "has_column_header": false,
                        "has_row_header": false,
                        "children": data_list
                    }
                } as BlockObjectRequest
                tables = [pasedu_table]
            } else {
                tables = data_list
            }
            print_table(tables)
            return Promise.resolve({ "results": tables } as AppendBlockChildrenResponse)
        })
        const delete_and_append_and_end = ( async (id_list:Array<string>) => {
            return await id_list.reduce((promise, id) => {
                return promise.then(async () => {
                    await this.props.notion.blocks.delete({ block_id: id })
                })
            }, Promise.resolve() )
            .then( async () => {
                // 親要素にテーブルを追加
                return await this.props.notion.blocks.children.append({
                    block_id: id,
                    children: data_list as Array<BlockObjectRequest>
                })
            })
        })

        if (this.props.keep_table){
            if (basic_options !== undefined && basic_options.inspect == true) { return print_and_end() }
            else if (basic_options !== undefined && basic_options.delete == true && id_list !== null) {  return await delete_and_append_and_end(id_list)  }
            else { return append_and_end() }
        }
        if (id_list !== null) {
            if (basic_options === undefined) { return await delete_and_append_and_end(id_list) }
            else if (basic_options.inspect === true) { return print_and_end() }
            else if (basic_options.delete === false) { return await append_and_end() }
            else { return await delete_and_append_and_end(id_list) }
        } else {
            if (basic_options === undefined) { return await append_and_end() }
            else if (basic_options.inspect === true) { return print_and_end() }
            else { return await append_and_end() }
        }
    }


    async #add_formula(
        formula_call : DirectedMultiFormulaOptions,
        basic_options?: {delete?:boolean, inspect?:boolean}
    ): Promise<AppendBlockChildrenResponse> {
        const {append, calls, labels, not_apply_to, max, min} = formula_call
        const direction = (append==="newRow") ? "C" : "R"
        const formulas = calls.map( c => `${direction}_${c}` as FormulaCall)
        const lbs = labels ?? calls.map( c => String(c).replace("SECOND", "2nd ").replace("NAME", "(name)") )
        const calllist = formulas.map( (formula, idx) => {return {formula, "label":lbs[idx], not_apply_to, max, min} })
        return await this.multi_processing( [ { "func":"calculate_table", "options": calllist } ], basic_options )
    }


    async #add_formula_multi(
        formula_calls: Array<{
            append: "newRow" | "newColumn",
            calls: Array<BasicFormula>,
            labels?: Array<string>,
            options? : Omit<FormulaOptions, "formula"|"label">,
        }>,
        basic_options?: {delete?:boolean, inspect?:boolean}
    ): Promise<AppendBlockChildrenResponse> {
        const formula_list = formula_calls.map( fc => {
            const direction = (fc.append==="newRow") ? "C" :"R"
            const formulas = fc.calls.map( c => `${direction}_${c}` as FormulaCall)
            const lbs = fc.labels ?? fc.calls.map(c => c.replace("SECOND", "2nd").replace("NAME","(name)"))
            return formulas.map((formula, idx) => {return {formula, "label":lbs[idx], ...fc.options} as FormulaOptions })
        }).flat()
        
        return await this.multi_processing( [ { "func":"calculate_table", "options": formula_list } ], basic_options )   
    }


    async #get_lists(): Promise<{"texts_ids":Array<string>, "texts":Array<string>, "table_id":string}> {
        return await this.notion_with_id.blocks.children.list().then( (response) => {
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
            return {texts_ids, texts, table_id}
        })
    }


    async #get_tables_and_rows( ): Promise<TableResponse> {
       const tableinfo_list:Array<TableProps> = []
       const results_list: Array<Array<PartialBlockObjectResponse|BlockObjectResponse>> = []

        return await this.notion_with_id.blocks.children.list().then( async (response) => {
            // 親要素以下の table block object の id と ヘッダーの設定と元のテーブルの列数を取得する
            response.results.forEach(item => {
                if ("type" in item) {
                    if (item.type=="table") {
                        const { id } = item
                        const {has_row_header, has_column_header, table_width} = item.table
                        tableinfo_list.push( {id, has_row_header, has_column_header, table_width} )
                    }
                }
            })
            if (!tableinfo_list.length) {throw new Error("子要素にテーブルが見つかりません")}
        
            return await tableinfo_list.reduce((promise, table) => {
                return promise.then(async () => {
                    await this.props.notion.blocks.children.list({ block_id: table.id }).then(
                        (response) =>  results_list.push(response.results)
                    )
                })
            }, Promise.resolve() )
        }).then(  () => {
            // 行データから必要な情報を取り出す
            const tablerows_lists: Array<Array<TableRowBlockObject>> = results_list.map(
                list => list.map(item => {
                    if ( "type" in item && "table_row" in item ) {
                        const {type, table_row} = item
                        return {"object": "block" as const, type, table_row}
                    } else {
                        throw new Error("response.results_list 内の行データにおいて、type あるいは table_row がないものが存在します")
                    }
                })
            )
            return {tableinfo_list, tablerows_lists}
        })
    }


    #maltiple_manipulation (
        response: TableResponse,
        org_table_rows: Array<TableRowBlockObject>,
        default_rowidx: number,
        default_colidx: number,
        calls: Array<ManipulateSet>
    ): {"table_rows": Array<TableRowBlockObject>, "new_def_rowidx":number, "new_def_colidx":number} {
        // 処理のチェック
        const manipus = calls.map( call => call.func)
        const trans_idx = manipus.findIndex(t => t=="transpose")
        if ( trans_idx != -1 ) {
            if ((manipus.length > 2) && (trans_idx!=0 && trans_idx!=manipus.length-1 )  ) {
                throw new Error("転置は一番最初あるいは一番最後に実行してください")
            }
        }
        
        // 処理
        let table_rows = [...org_table_rows]
        let eval_limit_row = table_rows.length
        let eval_limit_col = response.tableinfo_list[0].table_width
        let new_def_rowidx = default_rowidx
        let new_def_colidx = default_colidx
        calls.forEach( call => {
            if (call.func == "add_number") {
                // 各行に連番を振る
                table_rows = add_row_number(call.options, table_rows, new_def_rowidx)
                new_def_colidx += 1
                eval_limit_col += 1
            }
            else if (call.func == "apply_color") {
                // テーブルの各行・列について、指定に応じて色を付ける
                table_rows = change_text_color(call.options, new_def_rowidx, new_def_colidx, table_rows, eval_limit_row, eval_limit_col)
            }
            else if (call.func == "calculate_table") {
                // 各行・列に対して一様に数式評価を行う行・列を追加する
                table_rows = add_formula_to_table(call.options, new_def_rowidx, new_def_colidx, table_rows, eval_limit_row, eval_limit_col)
            }
            else if (call.func == "calculate_cell") {
                // セルの命令に従い計算
                table_rows = add_formula_to_cell(new_def_rowidx, new_def_colidx, table_rows)
            }
            else if (call.func == "sort") {
                // テーブル(の行データ)をソートする
                table_rows = sort_tablerows_by_col(call.options, new_def_rowidx, table_rows, eval_limit_row)
            }
            else if (call.func == "transpose") {
                // テーブル(の行データ)を転置する
                table_rows = [...Array(response.tableinfo_list[0].table_width)].map( (_x, idx) => {
                    const new_cells = table_rows.map( row => row.table_row.cells[idx] )
                    return {"object":"block", "type":"table_row", "table_row":{"cells": new_cells}}
                } );
                [eval_limit_col, eval_limit_row] = [eval_limit_row, eval_limit_col];
                [new_def_rowidx, new_def_colidx] = [new_def_colidx, new_def_rowidx]
            }
            
        })
        return { table_rows, new_def_rowidx, new_def_colidx }
    }
}