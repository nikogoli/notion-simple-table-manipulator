import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";

import { TableManipulator } from "../Manipulate.ts"


const NOTION_TOKEN = "secret_BDbxoapZik07UVZ0QRUfcU4wT2FCzTjUqwDM1u5zwD9";
const notion = new Client({auth: NOTION_TOKEN});

const url = "https://www.notion.so/49753d7e7cb84a65a62475059d4d2c03#b50f9a91bffc42e28f36793bb1be3af0"

const simple_table = new TableManipulator({"client":notion, "url":url})

await simple_table.from_file({
    "path":"./table_data.csv", "row_label":true, "col_label":true, "jsonkey_as_cell":false
})
.then(response => console.log(response))


