import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";
import { BlockObjectRequest,
        AppendBlockChildrenResponse,
        GetBlockParameters,
        QueryDatabaseParameters,
        UpdateBlockParameters,
        DeleteBlockParameters,
        AppendBlockChildrenParameters,
        ListBlockChildrenParameters,
        GetDatabaseParameters,
        CreateDatabaseParameters,
        UpdateDatabaseParameters,
        CreatePageParameters,
        GetPageParameters,
        UpdatePageParameters,
        GetPagePropertyParameters,
        PartialBlockObjectResponse,
        BlockObjectResponse,
} from "https://deno.land/x/notion_sdk/src/api-endpoints.ts";

import {
    ManipulateSet,
    BasicFormula,
    CallInfo,
    ColorInfo,
    ConvertInfo,
    DirectedMultiCallInfo,
    FormulaCall,
    FormulaInfo,
    ImportInfo,
    NumberingInfo,
    NonDirectedMultiCallInfo,
    SeparateInfo,
    SingleCallInfo,
    SortInfo,
    TableProps,
    TableResponse,
    TableRowBlockObject,
} from "./base_types.ts"

import {
    add_formula_to_table,
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


export interface ApiInformations {
    client: Client
    url: string
}


export interface GenericCall {
    calls : Array<ManipulateSet>
    inspect? : boolean
}


type WithoutId<P> =  Omit<P, "block_id" | "database_id" | "page_id"> 


export class TableManipulator {

    public readonly props: {"notion":Client, "url":string, "block_id":string} = {
        notion : new Client(),
        url : "",
        block_id: "",
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
        //console.log(`Block Id : "${this.props.block_id}"`)
    }


    public readonly notion_with_id = {
        blocks : {
            retrieve : ( (args: WithoutId<GetBlockParameters>) => {
                return this.props.notion.blocks.retrieve({"block_id":this.props.block_id, ...args})
            } ),
            update : ( ( args: WithoutId<UpdateBlockParameters> ) => {
                return this.props.notion.blocks.update({"block_id":this.props.block_id, ...args})
            } ),
            delete : ( ( args: WithoutId<DeleteBlockParameters> ) => { 
                return this.props.notion.blocks.delete({"block_id":this.props.block_id, ...args})
            } ),
            children : {
                append: ( ( args: WithoutId<AppendBlockChildrenParameters>) => {
                    return this.props.notion.blocks.children.append({"block_id":this.props.block_id, ...args})
                } ),
                list: (  (args: WithoutId<ListBlockChildrenParameters>)  => {
                    return this.props.notion.blocks.children.list({"block_id":this.props.block_id, ...args})
                } )
            }
        },
        databases: {
            retrieve : ( ( args: WithoutId<GetDatabaseParameters> ) => {
                return this.props.notion.databases.retrieve({"database_id":this.props.block_id, ...args})
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
            retrieve : ( ( args: WithoutId<GetPageParameters> ) => {
                return this.props.notion.pages.retrieve( {"page_id":this.props.block_id, ...args} )
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
        options: NumberingInfo | null,
        inspect = false
    ): Promise<AppendBlockChildrenResponse> {
        if (options === null ){
            const options: NumberingInfo = { 
                "label":"", "text_format":"{num}", "start_number": 1, "step": 1}
            return await this.table_manipulations({
                calls: [ {"manipulation":"numbering", "options":options} ],
                inspect
            })
        } else {
            return await this.table_manipulations({
                calls: [ {"manipulation":"numbering", "options":options} ],
                inspect
            })
        }
    }
    

    public add_row_from_list() {}


    public readonly apply_color = {
        maxmin : ( async ( 
                options: ColorInfo,
                inspect = false
            ): Promise<AppendBlockChildrenResponse> => {
                return await this.table_manipulations({
                    calls: [ {"manipulation":"colored", "options":options} ],
                    inspect
                })
            })
        //if : (() => {})
    }


    public readonly calculate_table = {
        sum: ( async (
                formula_call: SingleCallInfo,
                inspcet = false
            ) => {
                const {append, label, excludes, max, min } = formula_call
                return await this.#add_formula({"calls":["SUM"], append, "labels":[label ?? "Sum"], excludes, max, min}, inspcet)
            }),

        average: ( async (
                formula_call: SingleCallInfo,
                inspcet = false
            ) => {
                const {append, label, excludes, max, min } = formula_call
                return await this.#add_formula({"calls":["AVERAGE"], append, "labels":[label ?? "Average"], excludes, max, min}, inspcet)
            }),

        count: ( async (
                formula_call: SingleCallInfo,
                inspcet = false
            ) => {
                const {append, label, excludes, max, min } = formula_call
                return await this.#add_formula({"calls":["COUNT"], append, "labels":[label ?? "Count"], excludes, max, min}, inspcet)
            }),
        
        max: ( async (
                formula_call: SingleCallInfo,
                inspcet = false
            ) => {
                const {append, label, excludes, max, min } = formula_call
                return await this.#add_formula({"calls":["MAX"], append, "labels":[label ?? "Max"], excludes, max, min}, inspcet)
            }),

        second_max: ( async (
                formula_call: SingleCallInfo,
                inspcet = false
            ) => {
                const {append, label, excludes, max, min } = formula_call
                return await this.#add_formula({"calls":["SECONDMAX"], append, "labels":[label ?? "2nd Max"], excludes, max, min}, inspcet)
            }),

        max_name: ( async (
                formula_call: SingleCallInfo,
                inspcet = false
            ) => {
                const {append, label, excludes, max, min } = formula_call
                return await this.#add_formula({"calls":["MAXNAME"], append, "labels":[label ?? "Max(name)"], excludes, max, min}, inspcet)
            }),

        second_max_name: ( async (
                formula_call: SingleCallInfo,
                inspcet = false
            ) => {
                const {append, label, excludes, max, min } = formula_call
                return await this.#add_formula({"calls":["SECONDMAXNAME"], append, "labels":[label ?? "2nd Max(name)"], excludes, max, min}, inspcet)
            }),

        min: ( async (
                formula_call: SingleCallInfo,
                inspcet = false
            ) => {
                const {append, label, excludes, max, min } = formula_call
                return await this.#add_formula({"calls":["MIN"], append, "labels":[label ?? "Min"], excludes, max, min}, inspcet)
            }),

        second_min: ( async (
                formula_call: SingleCallInfo,
                inspcet = false
            ) => {
                const {append, label, excludes, max, min } = formula_call
                return await this.#add_formula({"calls":["SECONDMIN"], append, "labels":[label ?? "2nd Min"], excludes, max, min}, inspcet)
            }),

        min_name: ( async (
                formula_call: SingleCallInfo,
                inspcet = false
            ) => {
                const {append, label, excludes, max, min } = formula_call
                return await this.#add_formula({"calls":["MINNAME"], append, "labels":[label ?? "Min(name)"], excludes, max, min}, inspcet)
            }),

        second_min_name: ( async (
                formula_call: SingleCallInfo,
                inspcet = false
            ) => {
                const {append, label, excludes, max, min } = formula_call
                return await this.#add_formula({"calls":["SECONDMINNAME"], append, "labels":[label ?? "2nd Min(name)"], excludes, max, min}, inspcet)
            }),

        multiple : ( async (
                formula_calls: Array<DirectedMultiCallInfo>,
                inspcet = false
            ) => { return await this.#add_formula_multi(formula_calls, inspcet) }),
        
        multiple_col : ( async (
                formula_call: NonDirectedMultiCallInfo,
                inspcet = false
            ) => { return await this.#add_formula({"append":"newColumn", ...formula_call}, inspcet) }),
        
        multimple_row : ( async (
            formula_call: NonDirectedMultiCallInfo,
                inspcet = false
            ) => { return await this.#add_formula({"append":"newRow", ...formula_call}, inspcet) }),
    }


    public join(){}


    public async separate(
        options: SeparateInfo,
        inspect?: boolean
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

            return await this.#append_or_inspect(
                table_props_list, inspect
            )
        })
    }


    public async sort(
        options: SortInfo,
        inspect = false
): Promise<AppendBlockChildrenResponse> {
    return await this.table_manipulations({
        calls: [ {"manipulation":"sort", "options":options} ],
        inspect
    })
}


    public async transpose(
        inspect? : boolean
    ): Promise<AppendBlockChildrenResponse> {
        return await this.table_manipulations({
            calls: [ {"manipulation":"transpose", "options":null} ],
            inspect
        })
    }


    public calculate_cell(){}


    public readonly convert ={
        to_list : ( () => {}),
        from_list : ( () => {})
    }


    public async from_file(
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
            
            return await this.#append_or_inspect([table_props], inspect)
        })
    }


    async #append_or_inspect(
        data_list: Array<BlockObjectRequest>,
        inspect: boolean | undefined
    ): Promise<AppendBlockChildrenResponse> {
        // inspcet == true のときは、リクエストには投げずにそのデータを返す
        if (inspect) {
            print_table(data_list)
            return Promise.resolve({ "results": data_list } as AppendBlockChildrenResponse)
        }
        
        // 親要素にテーブルを追加
        return await this.props.notion.blocks.children.append({
            block_id: this.props.block_id,
            children: data_list
        })
    }


    async #add_formula(
        formula_call : DirectedMultiCallInfo,
        inspect = false
    ): Promise<AppendBlockChildrenResponse> {
        const {append, calls, labels, excludes, max, min} = formula_call
        const direction = (append==="newRow") ? "C" : "R"
        const formulas = calls.map( c => `${direction}_${c}` as FormulaCall)
        const lbs = labels ?? calls.map( c => String(c).replace("SECOND", "2nd ").replace("NAME", "(name)") )
        return await this.table_manipulations({
            calls: [ {
                        "manipulation":"fomula",
                        "options": {
                            "formula_list": formulas.map( (formula, idx) => {return {formula, "label":lbs[idx], excludes, max, min} })
                        }
                    } ],
            inspect
        })
    }


    async #add_formula_multi(
        formula_calls: Array<{
            append: "newRow" | "newColumn",
            calls: Array<BasicFormula>,
            labels?: Array<string>,
            options? : Omit<CallInfo, "formula"|"label">,
        }>,
        inspect = false
    ): Promise<AppendBlockChildrenResponse> {
        const formula_list = formula_calls.map( fc => {
            const direction = (fc.append==="newRow") ? "C" :"R"
            const formulas = fc.calls.map( c => `${direction}_${c}` as FormulaCall)
            const lbs = fc.labels ?? fc.calls.map(c => c.replace("SECOND", "2nd").replace("NAME","(name)"))
            return formulas.map((formula, idx) => {return {formula, "label":lbs[idx], ...fc.options} as CallInfo })
        }).flat()
        
        return await this.table_manipulations({
            calls: [ { "manipulation":"fomula", "options": { formula_list } } ],
            inspect
        })   
    }


    public async table_manipulations(
        {   calls,
            inspect }: GenericCall
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
    
            const table_rows = this.#maltiple_manipulation(response, org_rowobjs_list, default_rowidx, default_colidx, calls)
            const table_width = table_rows[0].table_row.cells.length
    
            // 更新した行データから、table block object を作成する
            const table_props = { "object": 'block', "type": "table", "has_children": true,
                "table": { "table_width": table_width,
                    "has_column_header": has_column_header,
                    "has_row_header": has_row_header,
                    "children": table_rows
                }
            } as BlockObjectRequest
            
            return await this.#append_or_inspect([table_props], inspect)
        })
    }


    async #get_tables_and_rows( ): Promise<TableResponse> {
       const tableinfo_list:Array<TableProps> = []
       const results_list: Array<Array<PartialBlockObjectResponse|BlockObjectResponse>> = []

        return await this.notion_with_id.blocks.children.list({}).then( async (response) => {
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
        let eval_limit_col = response.tableinfo_list[0].table_width
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
                table_rows = [...Array(response.tableinfo_list[0].table_width)].map( (_x, idx) => {
                    const new_cells = table_rows.map( row => row.table_row.cells[idx] )
                    return {"object":"block", "type":"table_row", "table_row":{"cells": new_cells}}
                } );
                
                [eval_limit_col, eval_limit_row] = [eval_limit_row, eval_limit_col]
            }
        })
        return table_rows
    }
}