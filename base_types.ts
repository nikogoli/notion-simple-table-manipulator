import { 
    ApiColor,
    RichTextItemResponse
} from "https://deno.land/x/notion_sdk/src/api-endpoints.ts"


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
    max?: ApiColor | ""
    min?: ApiColor | ""
}


// テーブル分割の設定をまとめたもの
export type SeparateInfo = {
    factory: {
        use_sort: SortInfo | false,
        count: number    
    } | false
    row_labels: Array<string> | []       // 分割の基準となる行ラベルのリスト 指定行の上で切り分ける
}


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