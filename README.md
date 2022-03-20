# notion-simple-table-manipulator
 notion API (を使う [notion_sdk](https://deno.land/x/notion_sdk)) を利用した simple table の操作を簡便化するための関数群 for deno
 
 ## できること
 - [**行の並び替え**](https://github.com/nikogoli/notion-simple-table-manipulator#%E8%A1%8C%E3%81%AE%E4%B8%A6%E3%81%B3%E6%9B%BF%E3%81%88)：列を指定し、その値を基準にテーブルの行を並び替える
 - [**行に連番を振る**](https://github.com/nikogoli/notion-simple-table-manipulator#%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%E3%81%AE%E5%90%84%E8%A1%8C%E3%81%AB%E9%80%A3%E7%95%AA%E3%82%92%E6%8C%AF%E3%82%8B)：各行に対し、指定したフォーマットで上から順に番号を振っていく
 - [**最大値・最小値に色付け**](https://github.com/nikogoli/notion-simple-table-manipulator#%E5%90%84%E8%A1%8C%E3%81%82%E3%82%8B%E3%81%84%E3%81%AF%E5%88%97%E3%81%AE%E6%9C%80%E5%A4%A7%E5%80%A4%E3%82%84%E6%9C%80%E5%B0%8F%E5%80%A4%E3%81%AE%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E3%81%AB%E8%89%B2%E3%82%92%E4%BB%98%E3%81%91%E3%82%8B)：各行あるいは列のなかの最大値や最小値を指定した色に変える
 - [**行・列ごとの合計や最大・最小を追加**](https://github.com/nikogoli/notion-simple-table-manipulator#%E5%90%84%E8%A1%8C%E3%81%82%E3%82%8B%E3%81%84%E3%81%AF%E5%88%97%E3%81%AB%E7%89%B9%E5%AE%9A%E3%81%AE%E6%95%B0%E5%BC%8F%E5%87%A6%E7%90%86%E3%82%92%E9%81%A9%E7%94%A8%E3%81%97%E3%81%9F%E7%B5%90%E6%9E%9C%E3%82%92%E6%96%B0%E8%A6%8F%E3%81%AE%E8%A1%8C%E5%88%97%E3%81%A8%E3%81%97%E3%81%A6%E8%BF%BD%E5%8A%A0%E3%81%99%E3%82%8B)：行あるいは列単位で数式処理を行った結果を、テーブルに追加する
 - [**テーブルの転置**](https://github.com/nikogoli/notion-simple-table-manipulator#%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%E3%82%92%E8%BB%A2%E7%BD%AE)：テーブルの行と列を入れ替える
 - [**テーブルの分割**](https://github.com/nikogoli/notion-simple-table-manipulator#%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%E3%82%92%E5%88%86%E5%89%B2)：指定した場所で、あるいは指定した行数ごとにテーブルを分割する
 - [**外部ファイルから作成**](https://github.com/nikogoli/notion-simple-table-manipulator#csv-%E3%81%8A%E3%82%88%E3%81%B3-json-%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%8B%E3%82%89%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%E3%82%92%E4%BD%9C%E6%88%90)：csv および json ファイルからテーブルを作成
 
 
 
### 注意点
- ~~テーブルを新規のものに差し替えるので、旧テーブルについたコメント等は消える (旧テーブルは notion の Trash に移動)~~ <br>
  いまのところはまだ調整中なので、操作対象のテーブルの下に新しいテーブルを追加するだけで、元のテーブルの消去は行わない
- simple table の id ではなく、**テーブルが入っている親要素の id を指定して使用する**



## 使用例
### 基本形
```typescript
import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts"
import { 
    HogehogeInfo,    // オプションの設定 無いこともある
    table_hogehoge   // 操作関数
} from "https://pax.deno.dev/nikogoli/notion-simple-table-manipulator/mod.ts"


const notion = new Client({auth: "~~~~"})
const target_url = "---親要素のid---"
// const target_url = "https://www.notion.so/---ページのid---#---親要素のid---"  // notion 上で取得したブロックのリンクでもOK


// 操作の追加設定：
const info: HogehogeInfo = {"label":"HOGE"}


// 「元のテーブルの情報を取得 + テーブルを操作 + 新規テーブルとして親要素の下に追加」をまとめて行う
await table_hogehoge(notion, target_url, info).then(response => console.log(response))

// 操作関数の最後の引数を true にすると、操作後のテーブルのデータの append は行わず response.results に入れて返す (確認・追加操作用)
// await table_hogehoge(notion, target_url, info, true).then(response => console.log(response))
```


### 行の並び替え
```typescript
import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts"
import { 
    SortInfo,
    table_sorting
} from "https://pax.deno.dev/nikogoli/notion-simple-table-manipulator/mod.ts"

// ...

// 並び替えの設定：基準とする列のラベル、セルの内容を数値として比較するかどうか、降順にするかどうか
const info: SortInfo = {"label": "こうげき", "as_int": true, "reverse": true}

await table_sorting(notion, target_url, info).then(response => console.log(response))
```
![20220320173857](https://user-images.githubusercontent.com/49331838/159157322-92d47172-bc21-4258-944b-71bad4e3a3a3.png)




### テーブルの各行に連番を振る
```typescript
import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts"
import { 
    NumberingInfo,
    table_row_numbering
} from "https://pax.deno.dev/nikogoli/notion-simple-table-manipulator/mod.ts"

// ...

// 連番の設定：番号のフォーマットの指定 ( {num}の部分が数字に置き換わる)  番号のみの普通の形式で良い場合は、引数自体を渡さない
const info: NumberingInfo = {"text_format":"{num}体目"}

await table_row_numbering(notion, target_url, info).then(response => console.log(response))
```
![20220320174508](https://user-images.githubusercontent.com/49331838/159157223-63c318ed-8cb6-4f67-95a5-a5025955b38d.png)




### 各行あるいは列の最大値や最小値のテキストに色を付ける
```typescript
import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts"
import { 
    ColorInfo,
    change_maxmin_colored
} from "https://pax.deno.dev/nikogoli/notion-simple-table-manipulator/mod.ts"

// ...

// 連番の設定：最大・最小を評価する方向(行なら"R"、列なら"C")、最大値の色、最小値の色
const info: ColorInfo = {"direction": "R", "max":"red", "min":"blue"}

await change_maxmin_colored(notion, target_url, info).then(response => console.log(response))
```
![20220320175712](https://user-images.githubusercontent.com/49331838/159157044-f575350d-647c-4fd1-8ab6-e37f2e6e2d3f.png)




### 各行あるいは列に特定の数式処理を適用した結果を新規の行・列として追加する
```typescript
import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts"
import { 
    FormulaInfo,
    add_formula_row_col
} from "https://pax.deno.dev/nikogoli/notion-simple-table-manipulator/mod.ts"

// ...

// 数式の設定： {"formula":適用する数式の種類, "label":追加される行・列のラベル} 形式でリスト内に列記する
//             数式は、"式を評価する方向の指示文字(R or C)_式の種類"で表現される。式は SUM, AVERAGE, MAX, MIN, COUNT と **NAME系
const info: FormulaInfo = {"formula_list":[
      {"formula":"R_SUM", "label":"合計"}, {"formula":"C_AVERAGE", "label":"平均"},  {"formula":"C_MAXNAME","label":"最大"}
    ] }

await add_formula_row_col(notion, target_url, info).then(response => console.log(response))
```
![20220320185527](https://user-images.githubusercontent.com/49331838/159157071-39715632-3f90-43d2-b137-36467f4ae5b9.png)




### テーブルを転置
```typescript
import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts"
import { 
    table_transposation
} from "https://pax.deno.dev/nikogoli/notion-simple-table-manipulator/mod.ts"

// ...

await table_transposation(notion, target_url).then(response => console.log(response))
```
![20220320173337](https://user-images.githubusercontent.com/49331838/159157238-4be754b0-bb28-4447-9d26-111d6f7de34d.png)




### テーブルを分割
```typescript
import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts"
import { 
    SeparateInfo,
    table_separation
} from "https://pax.deno.dev/nikogoli/notion-simple-table-manipulator/mod.ts"

// ...

// 分割の設定
//    テーブル内の空白行で分割           → "factory": false, "row_tables": []
//    指定した行数ごとに分割 (ソートなし) → "factory":{"use_sort": false, "count": 2},  "row_tables": []
//    指定した行数ごとに分割 (ソートあり) → "factory":{"use_sort": SortInfo, "count": 2},  "row_tables": []
//    指定したラベルの行の上で分割        → "factory": false, "row_tables": ["赤1"]
const info: SeparateInfo = {
    "factory": {  "use_sort": { "label": "こうげき","as_int": true, "reverse": true },
                 "count": 2 },
    "row_labels": []
}

await table_separation(notion, target_url, info).then(response => console.log(response))
```
![20220320172422](https://user-images.githubusercontent.com/49331838/159157284-57e5b44a-0be8-49f2-a99a-0f7cc8a9b233.png)




### csv および json ファイルからテーブルを作成
```typescript
import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts"
import { 
    ImportInfo,
    table_from_file,
} from "https://pax.deno.dev/nikogoli/notion-simple-table-manipulator/mod.ts"

// ...

// ファイルへのパス、第一行をヘッダーにするかどうか、第1列をヘッダーにするかどうか、json のキーを各行の先頭のセルの内容にするかどうか
const info: ImportInfo = {"path":"~~~~~.json", "row_label":true, "col_label":true, "jsonkey_as_cell":false}

await table_from_file(notion, target_url, info).then(response => console.log(response))
```

