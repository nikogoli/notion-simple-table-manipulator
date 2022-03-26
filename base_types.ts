import { 
    ApiColor,
    RichTextItemResponse
} from "https://deno.land/x/notion_sdk/src/api-endpoints.ts"


// 数式命令
export type FormulaCall = "R_SUM" | "R_AVERAGE" | "R_COUNT" |
                    "R_MAX" | "R_SECONDMAX" | "R_MAXNAME" | "R_SECONDMAXNAME" |
                    "R_MIN" | "R_SECONDMIN" | "R_MINNAME" | "R_SECONDMINNAME" |
                    "C_SUM" | "C_AVERAGE" | "C_COUNT" |
                    "C_MAX" | "C_SECONDMAX" | "C_MAXNAME" | "C_SECONDMAXNAME" |
                    "C_MIN" | "C_SECONDMIN" | "C_MINNAME" | "C_SECONDMINNAME"


// 操作と設定の組
export type ManipulateSet = {"manipulation":"sort", "options": SortInfo} | 
                            {"manipulation":"numbering", "options": NumberingInfo|null} |
                            {"manipulation":"colored", "options": ColorInfo} |
                            {"manipulation":"fomula", "options": FormulaInfo} |
                            {"manipulation":"transpose", "options": null} |
                            {"manipulation":"calculate", "options": null}
                            // | {"manipulation":"separate", "options": SeparateInfo}



// リストから追加する際の設定
export interface AppendFromInfo {
    col_label: {sep: string} | false
    separation: string
}                         


export interface CallInfo {
    formula: FormulaCall
    label?: string
    excludes? : Array<string> | Array<number>
    max?: ApiColor
    min?:ApiColor
}


// セルの中身・セルの行・列インデックス・セルの plain_text をセットにしたもの
export interface CellObject {
    cell: Array<RichTextItemResponse>|[]
    r_idx: number
    c_idx: number
    text : string
}


// テキストの色変更の設定をまとめたもの
export interface ColorInfo {
    direction : "R" | "C"
    excludes? : Array<string> | Array<number>
    max?: ApiColor | ""
    min?: ApiColor | ""
}


// リストから変換する際の設定をまとめたもの
export interface ConvertInfo {
    row_label: boolean
    col_label: {sep: string} | false
    separation: string
}


// 一様な数式行・列の追加の設定をまとまるもの (暫定)
export interface FormulaInfo {
    formula_list: Array<CallInfo>
}


// csv や json からテーブルを作るの設定をまとめたもの
export interface ImportInfo {
    path: string
    row_label: boolean
    col_label: boolean
    jsonkey_as_cell: boolean
}


// 連番の設定をまとめるもの (暫定)
export interface NumberingInfo {
    label?: string
    start_number?: number
    step?: number
    text_format?: "{num}" | string
}


type SeparateMethod = "by_blank" | "by_number" | "by_labels"
type SeparateOptions<T> = T extends "by_blank"
    ? {options: null}
    : T extends "by_number"
        ? {options: {number: number}}
        : {options: {row_labels: Array<string>}}


// テーブル分割の設定をまとめたもの
export type SeparateInfo =
    { method : "by_blank", options: null} |
    { method : "by_number", options: {number: number} } |
    { method : "by_labels", options: {row_labels: Array<string>} }

/*    

        by_blank : boolean
        by_number : {}
    factory: {
        use_sort: SortInfo | false,
        count: number    
    } | false
    row_labels: Array<string> | []       // 分割の基準となる行ラベルのリスト 指定行の上で切り分ける
}
*/

// ソートの設定をまとめるもの(暫定) 現状は、列基準のソートのみを想定
export interface SortInfo {
    label: string
    as_int: boolean
    reverse: boolean
}


// BlockObjectResponse 型を table object に限定したもの
export interface TableRowBlockObject {
    object: "block"
    table_row: { cells: Array<Array<RichTextItemResponse>|[]> }
    type: "table_row"
}


// get_tables_and_rows の返り値で、親要素に含まれるテーブルとそれらの行データに関する諸々を格納するもの
export interface TableRowResponces {
    parent_id: string
    table_id_list: Array<string>
    header_info_list: Array<Array<boolean>>
    table_width_list: Array<number>
    rowobjs_lists: Array<Array<TableRowBlockObject>>
}

// get_tables_and_rows の返り値
export interface TableResponse {
    tableinfo_list : Array<TableProps>
    tablerows_lists : Array<Array<TableRowBlockObject>>
}

// get_tables_and_rows において取得したテーブルの情報をまとめるもの
export interface TableProps {
    id : string
    has_column_header : boolean
    has_row_header : boolean
    table_width: number
}