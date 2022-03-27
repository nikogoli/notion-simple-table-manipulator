# Example


### 0. 準備

まず notion_sdk を import し、そのインスタンスを作成する。

次に notion に適当なページを作って callout を設置し、その **callout を右クリックし**メニューから “copy link to block”を選択して link を取得する

TableManipulator を import し、取得したリンクと notion_sdk のインスタンスから、TableManipulator のインスタンスを作成する
```typescript
import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";
import { TableManipulator } from "https://pax.deno.dev/nikogoli/notion-simple-table-manipulator/mod.ts"

const NOTION_TOKEN = "=~=~=~=~=~=~=~=~=~=~=~";
const notion = new Client({auth: NOTION_TOKEN});

const link = "https://www.notion.so/=================#~~~~~~~~~~~~~~~~~~~~~~~~~"
const simple_table = new TableManipulator({"client":notion, "url":url})
```
<br>

-------------------

### 1. 外部ファイルのデータを使ってテーブルを追加する

以下の内容を table_data.csv として保存する。

```csv
,HP,こうげき,ぼうぎょ,とくこう,とくぼう,すばやさ
緑1,45,49,49,65,65,45
赤1,39,52,43,60,50,65
青1,44,48,65,50,64,43
緑2,45,49,65,49,65,45
赤2,39,52,43,60,50,65
青2,50,65,64,44,48,43
```

このファイルから、インスタンスに渡したリンクが示す親要素の下に simple table を追加してみる。

引数として、ファイルパスを渡す。また今回は Header row と Header column の両方を有効にする。

```typescript
await simple_table.from_file({ path:"./table_data.csv", set_header_row: true, set_header_colmun: true })
.then(response => console.log(response))
```

処理が正常に行われると、次のような simple table が親要素のもとに追加される。

![01](https://user-images.githubusercontent.com/49331838/160287414-fc0da431-b53f-4fca-b12d-843b1386a552.png)


<br>

-------------------

### 2. セルのテキストに色付け

各列のスターテスごとに、その最大値と最小値に色をつけてみる。

今回は列なので比較方向として列(`C`)を指定し、最大値の色として赤、最小値の色として青を指定する。

```typescript
await simple_table.apply_color.maxmin({direction:"C", max:"red", min:"blue"})
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のように更新される。

![02](https://user-images.githubusercontent.com/49331838/160287522-8ebdad26-2900-497f-9177-a89997fc9871.png)

<br>

-------------------

### 3. 行の並び替え

「ぼうぎょ」列を基準に行をソートしてみる。

今回は「数値として比較」+「降順(大→小)」を採用する。この場合はオプション指定を省略できる。

```typescript
await simple_table.sort({label:"ぼうぎょ"}) //= {label:"ぼうぎょ", as_int:true, high_to_low:true}
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のように更新される

![03](https://user-images.githubusercontent.com/49331838/160287529-21716b1d-123f-4d6c-b0eb-f405c6f7a46f.png)

<br>

-------------------

### 4. テーブルに数値計算を適用

右端に「(行の)合計」列を追加してみる。

列の追加なので `append: newColumn` を指定する。また、追加した列でも最大値と最小値に色をつけることができる。

```typescript
await simple_table.calculate_table.sum({append:"newColumn", label:"合計", max:"red", min:"blue"})
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のように更新される。

![04](https://user-images.githubusercontent.com/49331838/160287563-5d31ac0c-2866-4400-b8bb-48bfb54fc462.png)

<br>

-------------------


### 5. 各行に連番を追加 + 確認モード

左端に連番を追加してみる。

連番では文字列の形式を指定できるので、今回は`"第{num}位"`を指定してみる。`text_format`オプションに`{num}`を含む文字列を渡すと、その部分が番号に置き換えられる。

また、今回の変更は重要ではないので、メソッドの第2引数に `{inspect: true}` を与え、確認モードで実行してみる。

確認モードでは、操作した結果のテーブルのデータは作成されるが、notion には追加されない。

```typescript
await simple_table.add_number({label:"ぼうぎょの順位", text_format:"第{num}位"}, {inspect:true}))
```

処理が正常に行われると、確認モードなのでコンソールに次のように更新された simple table が表示される。

![05](https://user-images.githubusercontent.com/49331838/160287599-b78058bf-371b-4c3d-bb57-bf8efc1a0437.png)

<br>

-------------------


### 6. テーブルを転置する

テーブルの行と列を入れ替えてみる。
    
今回の操作も重要ではないので、操作前のテーブルは削除せず残しておくことにする。

第2引数に `{delete: false}` を与えると、テーブルの操作・追加を行ったあと、元のテーブルを削除せず終了する。
    
```typescript
await simple_table.transpose({delete:false})
.then(response => console.log(response))
```

処理が正常に行われると、次のような simple table が追加される。でも不要なのでこのテーブルは削除し、4 のテーブルを引き続き利用する。

![06](https://user-images.githubusercontent.com/49331838/160287614-d66afa30-8796-4e88-affc-acce6d8a25b1.png)

<br>

なお、インスタンスを作成する際に以下のように `keep_table = true` を指定すると、常に `{delete: false}` を指定した状態となる。

```typescript
const simple_table = new TableManipulator({"client":notion, "url":url, "keep_table":true})
```

<br>

-------------------


### 7. リストから行を追加する

以下のような notion のリストからテーブルに行を追加してみる。

![07-1](https://user-images.githubusercontent.com/49331838/160287742-496636bb-a059-417a-afbc-7856091a3936.png)

セルの区切りとして「、」を指定する。

今回はテキストに列ラベルも含まれているので、ラベルとセルの内容の区切りとして「：」を指定する

ラベルの区切り文字がないテキストの場合、その列ラベルは「""」として扱われる。逆に、区切り文字で終わるテキストは空白セルとして扱われる。

```typescript
await simple_table.add_row_from_list({cell_separation_by:"、", label_separation_by:"："})
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のように更新される

![07-2](https://user-images.githubusercontent.com/49331838/160287734-90910396-bde4-4d47-8dca-7592768336db.png)

<br>

-------------------


### 8. セルの数式を計算する

追加した下の3行にも、列の合計のセルを追加してみる
    
以下のように、notion 上でセルに「row-summation」をしめす数式命令「=R_SUM」を追加する。

数式命令の後には、範囲指定として、「(」に続けて計算範囲の最初のセルと最後のセルのインデックスを記述する。`=R_SUM(1,7)`は、「その行の第1列セルから第7列セルまでの値の合計値」を意味することになる。

指定を省略した場合、ラベル(ヘッダー)部分を除いたその行あるいは列の先頭から数式命令のセルの手前まで、が範囲になる。今回は第0列がラベル部、数式命令のセルが第8列なので、`=R_SUM()`は`=R_SUM(1,7)`と同じ意味となる。

![08-1](https://user-images.githubusercontent.com/49331838/160287788-e5bad48d-a52f-41c2-bf1c-b0111240d636.png)

```typescript
await simple_table.calculate_cell()
.then(response => console.log(response))
```

処理が正常に行われると、次のように simple table 内の数式命令が計算結果に置き換わる

![08-2](https://user-images.githubusercontent.com/49331838/160287778-cde92cf6-a629-459e-834b-b77e723d0a3f.png)

<br>

-------------------

### 9. 複数の処理を連続で行う

追加部分も含めて、最大値と最小値の色付けとソートを行ってみる。

これまでは「色付け → 追加」と「ソート → 追加」という流れだったが、今回は、「色付け → ソート → 追加」のように2つの処理を連続して行う。

```typescript
await simple_table.multi_processing([
    {func:"apply_color", options:{direction:"C", max:"red", min:"blue"}},
    {func:"sort", options:{label:"合計"}}
])
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のように更新される。

![09](https://user-images.githubusercontent.com/49331838/160287802-bdd71f2e-af28-4864-a0d4-6dab8a5d3435.png)

<br>

-------------------


### 10. テーブルを分割する

テーブルを別のテーブルに分割してみる。
    
今回は、テーブルの分割方法として「特定の行の数ごとに分割」を採用し、`method: by_number` を指定する。
    

```typescript
await simple_table.separate({method:"by_number",options:{number:3}})
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のように上から3行ごとに別のテーブルに分割される。

![10](https://user-images.githubusercontent.com/49331838/160287830-83295d1f-5575-4431-b85c-0e2c29d8ef56.png)

<br>

-------------------


### 11. テーブルの結合する

分割されたテーブルを1つに結合してみる。
    
さらに、結合後のテーブルにおいて、「各列の平均値を計算した新しい行の追加」と「行方向での最大値と最小値の色付け」を行う

ただし、「合計」列の平均値については興味がないので、この部分は計算命令の対象から外したい。このような「適用しない部分」は、`not_apply_to` オプションにリストとして渡すことで設定できる。

同様に、「合計」列の値が最大値とされては意味がないので、最大・最小を判定する際にはこの部分は無視したい。このような「評価から除外する部分」は、`ignore` オプションにリストとして渡すことで設定できる

```typescript
await simple_table.join({
    calls:[ 
        {func:"calculate_table", options:[{formula:"C_AVERAGE", label:"平均", not_apply_to:["合計"], max:"red", min:"blue"}]},
        {func:"apply_color", options:{direction:"R", ignore:["合計"], max:"red", min:"blue"}}
    ]
})
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のように結合される。なお、色付けにおいて「合計」列を無視したので、以前の色付けが残っている。

![11](https://user-images.githubusercontent.com/49331838/160287841-b20affff-4e71-4fef-a66f-502c543b559d.png)

<br>

-------------------


### 12. テーブルをリストに変換する

テーブルを notion のリストに変換してみる
    
各セルの値の区切りとして「,」を指定する。今回はラベルは各行のテキストには含めないことにする。その場合、ラベルの区切りは指定しない。
    
```typescript
await simple_table.convert.to_list({cell_separation_by:","})
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のような csv-like なリストに変換される

![12](https://user-images.githubusercontent.com/49331838/160287854-97228770-c8d0-469f-8066-55b6653dd76b.png)


-------------------

### 13. リストをテーブルに変換する

notion のリストからテーブルを作成してみる。

仕組み自体は 7. の「リストから行を追加」とほぼ同じ。ただし、  Header row と Header column を有効にするかどうかの指定が必要。

今回はラベルがテキストに含まれていないので、ラベルの区切り文字は指定しない。

![13](https://user-images.githubusercontent.com/49331838/160290172-8b48d0d0-b16f-4430-aa16-a978bceac94d.png)


処理が正常に行われると、次のような simple table が作成される。
