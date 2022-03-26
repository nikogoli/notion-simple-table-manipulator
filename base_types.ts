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

export type BasicFormula = "SUM" | "AVERAGE" | "COUNT" | "MAX" | "SECONDMAX" | "MAXNAME" | "SECONDMAXNAME" |
                    "MIN" | "SECONDMIN" | "MINNAME" | "SECONDMINNAME"


// 操作と設定の組
export type ManipulateSet = {"func": "add_number", "options": NumberingInfo } |
                            {"func": "apply_color", "options": ColorInfo} |
                            {"func": "calculate_table", "options": Array<CallInfo>} |
                            {"func": "calculate_cell", "options": null} |
                            {"func": "sort", "options": SortInfo} |
                            {"func": "transpose", "options": null}




// リストから追加する際の設定
export interface AppendFromInfo {
    cell_separation_by: string
    label_separation_by?: string
}                         


// ===============  数式関連  =======================

interface BasicCall {
    append : "newRow" | "newColumn"
    calls: Array<BasicFormula>
    formula: FormulaCall
    label?: string
    labels?: Array<string>
    excludes? : Array<string> | Array<number>
    max?: ApiColor
    min?: ApiColor
}

export type CallInfo = Omit<BasicCall, "append"|"calls"|"labels">
export type SingleCallInfo = Omit<BasicCall, "formula"|"calls"|"labels">
export type DirectedMultiCallInfo = Omit<BasicCall, "formula"|"label">
export type NonDirectedMultiCallInfo = Omit<BasicCall, "append"|"formula"|"label">


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
    max?: ApiColor
    min?: ApiColor
}


// リストから変換する際の設定をまとめたもの
export interface ConvertFromInfo {
    use_header_row: boolean
    use_header_col: boolean
    cell_separation_by: string
    label_separation_by?: string
}
export type ConvertToInfo = Omit<ConvertFromInfo, "use_header_row"|"use_header_col">



// csv や json からテーブルを作るの設定をまとめたもの
export interface ImportInfo {
    path: string
    row_label: boolean
    col_label: boolean
    jsonkey_as_cell?: boolean
}


// 連番の設定をまとめるもの (暫定)
export interface NumberingInfo {
    label?: string
    start_number?: number
    step?: number
    text_format?: "{num}" | string
}


// テーブル分割の設定をまとめたもの
export type SeparateInfo =
    { method : "by_blank", options: null} |
    { method : "by_number", options: {number: number} } |
    { method : "by_labels", options: {row_labels: Array<string>} }


// ソートの設定をまとめるもの(暫定) 現状は、列基準のソートのみを想定
export interface SortInfo {
    label: string
    as_int?: boolean
    high_to_low?: boolean
}


// BlockObjectResponse 型を table object に限定したもの
export interface TableRowBlockObject {
    object: "block"
    table_row: { cells: Array<Array<RichTextItemResponse>|[]> }
    type: "table_row"
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