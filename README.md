# notion-simple-table-manipulator
 notion API を利用した simple table の操作を簡便化するための関数群 for deno
 
 
### 注意点
- テーブルを新規のものに差し替えるので、旧テーブルについたコメント等は消える (旧テーブルは notion の Trash に移動)
- simple table のリンクではなく、テーブルが入っている親要素へのリンクを指定して使用する



## 使用例
```typescript
import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";

import { SeparateInfo} from "https://pax.deno.dev/nikogoli/notion-simple-table-manipulator/mod.ts"
import { table_separation} from "https://pax.deno.dev/nikogoli/notion-simple-table-manipulator/Manipulations.ts"


const NOTION_TOKEN = "~~~~";
const notion = new Client({auth: NOTION_TOKEN});

// テーブルが入った親要素のリンク
const target_url = "https://www.notion.so/---ページのid---#---親要素のid---";

// 分割の設定
const separate_option: SeparateInfo = {
    "labels": ["青1", "赤2"]
}

// await 関数(notion-sdk の Client, url, 設定)
await table_separation(notion, target_url, separate_option).then(response => console.log(response))
```
