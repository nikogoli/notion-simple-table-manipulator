# notion-simple-table-manipulator
 notion API (を使う [notion_sdk](https://deno.land/x/notion_sdk)) を利用した simple table の操作を簡便化するための関数群 for deno
 
 
 
### 注意点
- ~~テーブルを新規のものに差し替えるので、旧テーブルについたコメント等は消える (旧テーブルは notion の Trash に移動)~~ <br>
  いまのところはまだ調整中なので、操作対象のテーブルの下に新しいテーブルを追加するだけで、元のテーブルの消去は行わない
- simple table のリンクではなく、テーブルが入っている親要素へのリンクを指定して使用する



## 使用例
[pax.deno.dev](https://pax.deno.dev/) を利用し、Github からインポートする際の url の短縮化をしている

```typescript
import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts"

import { 
    SeparateInfo,
    table_separation
} from "https://pax.deno.dev/nikogoli/notion-simple-table-manipulator/mod.ts"

const NOTION_TOKEN = "~~~~"
const notion = new Client({auth: NOTION_TOKEN})

// テーブルが入った親要素のリンク あるいは親要素のid
// const target_url = "https://www.notion.so/---ページのid---#---親要素のid---"
const target_url = "---親要素のid---"


// 分割の設定
const separate_option: SeparateInfo = {
    "factory": {                               // (必要ならソートをして) count で指定した行数のまとまりにテーブルを切り分ける
        "use_sort": {"label":"列ラベル1", "as_int":true, "reverse":true},
        "count": 3
    },
    "row_labels": ["行ラベル3", "行ラベル5"]    // 指定したラベルの行の上で、テーブルを切り分ける
    
    // "factory": false, "row_labels": []     // 何も設定しないとき   この場合は、テーブル内の空白行で切り分ける
}


// await 関数(notion-sdk の Client, url, 設定)
await table_separation(notion, target_url, separate_option).then(response => console.log(response))

// 最後の引数(inspect)として true を渡すと、テーブルを append せずそのまま返す
// await table_separation(notion, target_url, separate_option, true).then(
//    response => console.log(response.results)   // 分割された table block object のリスト
//)
```
