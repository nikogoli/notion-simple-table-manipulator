# notion-simple-table-manipulator
 notion API (を使う [notion_sdk](https://deno.land/x/notion_sdk)) を利用した simple table の操作を簡便化するための関数群 for deno
 
 ## できること
[example](example/example.md) あるいは [Document](Manipulate.md) を参照のこと

 1. 行を並び替える
 1. 行に連番を振る
 1. 最大値・最小値のセルのテキストの色を変更
 1. 行・列ごとの数値計算を行いその結果を追加
 1. セルに記述した数式命令に従って数値計算
 1. リストから行を追加
 1. テーブルをリストに変換・リストをテーブルに変換
 1. テーブルを転置
 1. テーブルを複数に分割・複数のテーブルを1つに結合
 1. csvやJSONファイルからテーブルを作成
 
 
 
### 注意点
- テーブルを新規のものに差し替えるので、旧テーブルは削除される<br>(元のテーブルを保持する場合は、セーフモードでインスタンスを作成するか、メソッドの引数として `{delete:false}` を渡す)
- simple table の id ではなく、**テーブルが入っている親要素の id を指定して使用する**
![20220320235938](https://user-images.githubusercontent.com/49331838/159168673-29bd3e27-1ab8-47b7-b91e-cb1fd92ffffb.png)



## 使用方法
### 基本形
```typescript
import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts"
import { TableManipulator } from "https://pax.deno.dev/nikogoli/notion-simple-table-manipulator/mod.ts"


const notion = new Client({auth: "~~~~"})
const target_url = "---親要素のid---"
// const target_url = "https://www.notion.so/---ページのid---#---親要素のid---"  // notion 上で取得したブロックのリンクでもOK


const simple_table = new TableManipulator({client:notion, url:target_url})
// const simple_table = new TableManipulator({client:notion, url:target_url, keep_table:true}) // セーフモード

// 例：指定した列の(数)値を基準に、(降順で)テーブルの行を並べ替える
await simple_table.sort({label:"こうげき"}).then(response => console.log(response))


// 第2引数として {inspect:true} を与えると、データは append されず response.results に入って返される。
// また、処理後のデータに対して console.table() が実行される
//
// await await simple_table.sort({label:"こうげき"}, {inspect:true} ).then(response => console.log(response))
// 
//  ┌───────┬───────┬──────┬──────────┬──────────┬──────────┬──────────┬──────────┐
//  │ (idx) │       │ HP   │ こうげき  │ ぼうぎょ  │ とくこう │ とくぼう  │ すばやさ  │
//  ├───────┼───────┼──────┼──────────┼──────────┼──────────┼──────────┼──────────┤
//  │     0 │ "赤1" │ "39" │ "52"     │ "43"     │ "60"     │ "50"     │ "65"     │
//  │     1 │ "緑1" │ "45" │ "49"     │ "49"     │ "65"     │ "65"     │ "45"     │
//  │     2 │ "青1" │ "44" │ "48"     │ "65"     │ "50"     │ "64"     │ "43"     │
//  └───────┴───────┴──────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```


