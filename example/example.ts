import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";

import { TableManipulator } from "https://pax.deno.dev/nikogoli/notion-simple-table-manipulator/mod.ts"


const NOTION_TOKEN = "-----------------";
const notion = new Client({auth: NOTION_TOKEN});

const url = "https://www.notion.so/=================#~~~~~~~~~~~~~~~~~~~~~~~~~"
const simple_table = new TableManipulator({"client":notion, "url":url, "keep_table":true})


const exsample_1st = ( async () => await simple_table.from_file({ path:"./table_data.csv", set_header_row:true, set_header_colmun:true }).then(response => console.log(response)))

const exsample_2nd =  ( async () => await simple_table.apply_color.maxmin({direction:"C", max:"red", min:"blue"}).then(response => console.log(response)))

const exsample_3rd = (async () => await simple_table.sort({label:"ぼうぎょ"}).then(response => console.log(response)) )

const exsample_4th = (async () => await simple_table.calculate_table.sum({append:"newColumn", label:"合計", max:"red", min:"blue"}).then(response => console.log(response)) )

const exsample_5th = (async () => await simple_table.add_number({label:"ぼうぎょの順位", text_format:"第{num}位"}, {inspect:true}) )

const exsample_6th = (async () => await simple_table.transpose({delete:false}).then(response => console.log(response)) )

const exsample_7th = (async () => await simple_table.add_row_from_list({cell_separation_by:"、", label_separation_by:"："}).then(response => console.log(response)) )

const exsample_8th = (async () => await simple_table.calculate_cell().then(response => console.log(response)) )

const exsample_9th = (async () => await simple_table.multi_processing([
        {func:"apply_color", options:{direction:"C", max:"red", min:"blue"}},
        {func:"sort", options:{label:"合計"}}
    ]).then(response => console.log(response)) )

const exsample_10th = (async () => await simple_table.separate({method:"by_number",options:{number:3}}).then(response => console.log(response)) )

const exsample_11th = (async () => await simple_table.join({
        calls:[ {func:"calculate_table", options:[{formula:"C_AVERAGE",label:"平均", not_apply_to:["合計"], max:"red", min:"blue"}]},
                {func:"apply_color", options:{direction:"R", ignore:["合計"], max:"red", min:"blue"}}
            ]
    }).then(response => console.log(response)) )

const exsample_12th = (async () => await simple_table.convert.to_list({cell_separation_by:","}).then(response => console.log(response)) )