// ======================================
// Hatchoria
// game.js
// Version 3.0 (作り直し版)
// クイズゲーム本体
// ======================================

import { auth } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    loadSaveData,
    saveGame,
    getPlayerData
} from "./save.js";

import { registerFriendCode } from "./gameFirebase.js";
import { getEquippedBonus } from "./equipment.js";

// ======================================
// 単語データ (実験用に3単語のみ)
// ======================================

const quizData = [

    // ===== 1ページ目 =====

    { q: "同じ、同一の", a: ["same"] },
    { q: "経験、体験", a: ["experience"] },
    { q: "実は、本当は", a: ["actually"] },
    { q: "休日、休暇", a: ["holiday"] },
    { q: "到着する", a: ["arrive"] },
    { q: "すぐに、まもなく", a: ["soon"] },
    { q: "…のあちこちに", a: ["around"] },
    { q: "…のために、…へ", a: ["for"] },
    { q: "…の中へ、…に", a: ["in"] },
    { q: "去る、出発する", a: ["leave"] },
    { q: "…を案内する", a: ["show"] },
    { q: "…でしょう、…だろう", a: ["will"] },
    { q: "わくわくした", a: ["excited"] },
    { q: "第1に、最初に", a: ["first"] },
    { q: "高い", a: ["tall"] },
    { q: "findの過去形", a: ["found"] },
    { q: "…を見つける、発見する", a: ["find"] },
    { q: "言語、言葉", a: ["language"] },
    { q: "例、実例", a: ["example"] },
    { q: "ちがう、異なる", a: ["different"] },
    { q: "…について", a: ["of"] },
    { q: "買い物をする", a: ["shop"] },
    { q: "区域、場所、地域", a: ["area"] },
    { q: "文化", a: ["culture"] },
    { q: "…を身につけて、…のある", a: ["with"] },
    { q: "そのように、そう", a: ["so"] },
    { q: "…するときに", a: ["when"] },
    { q: "スピーチ、演説", a: ["speech"] },
    { q: "もし…ならば", a: ["if"] },
    { q: "…してもよい", a: ["can"] },
    { q: "興味を持っている", a: ["interested"] },
    { q: "…を忘れる", a: ["forget"] },
    { q: "種類", a: ["kind"] },
    { q: "…だから、…なので", a: ["because"] },
    { q: "濃い、どろっとした", a: ["thick"] },
    { q: "早く", a: ["early"] },
    { q: "…のままでいる", a: ["stay"] },
    { q: "外国へ、外国の", a: ["foreign"] },
    { q: "変わる、変化する", a: ["change"] },
    { q: "もう1つ[1人]の", a: ["another"] },
    { q: "（人など）に…という名前をつける", a: ["name"] },
    { q: "…してもよい", a: ["may"] },
    { q: "…に（～を）たのむ", a: ["ask"] },
    { q: "canの過去形", a: ["could"] },
    { q: "情報", a: ["information"] },
    { q: "国際的な", a: ["international"] },
    { q: "自分自身の、独自の", a: ["own"] },
    { q: "（自動車などを）駐車する", a: ["park"] },
    { q: "遊ぶ", a: ["play"] },
    { q: "…するために【目的を表す】", a: ["to"] },


    // ===== 2ページ目 =====

    { q: "…を選ぶ", a: ["choose"] },
    { q: "…して【原因を表す】", a: ["to"] },
    { q: "重要な、大切な", a: ["important"] },
    { q: "光", a: ["light"] },
    { q: "（…を）始める", a: ["start"] },
    { q: "（…を）学ぶ、勉強する", a: ["learn"] },
    { q: "必要な", a: ["necessary"] },
    { q: "話、物語", a: ["story"] },
    { q: "難しい、困難な", a: ["difficult"] },
    { q: "（…を）理解する、わかる", a: ["understand"] },
    { q: "ほほえむ、微笑する", a: ["smile"] },
    { q: "うれしい", a: ["glad"] },
    { q: "【時間】…から", a: ["from"] },
    { q: "「It is … for + 人」", a: ["it"] },
    { q: "今、現在", a: ["now"] },
    { q: "先へ、前に", a: ["in"] },
    { q: "はっきりと、大声で", a: ["out"] },
    { q: "第2に、2番目に", a: ["second"] },
    { q: "簡単に、容易に", a: ["easily"] },
    { q: "理由、根拠", a: ["reason"] },
    { q: "（性質・特徴など）の", a: ["of"] },
    { q: "…を調べる、チェックする", a: ["check"] },
    { q: "しかしながら、けれども", a: ["however"] },
    { q: "やさしい、簡単な", a: ["easy"] },
    { q: "今から、…前に", a: ["ago"] },
    { q: "（今から）前に", a: ["put"] },
    { q: "tellの過去形", a: ["told"] },
    { q: "おおよそ、約…ごろ", a: ["about"] },
    { q: "長い時間、長い", a: ["long"] },
    { q: "いくらか、多少、少し、数人", a: ["some"] },
    { q: "…しないで", a: ["without"] },
    { q: "線、電線、路線", a: ["fine"] },
    { q: "火、炎", a: ["fire"] },
    { q: "giveの過去形", a: ["gave"] },
    { q: "～に…を与える、渡す、もたらす", a: ["give"] },
    { q: "少し", a: ["little"] },
    { q: "ほかの、別の", a: ["other"] },
    { q: "力", a: ["power"] },
    { q: "時刻", a: ["hour"] },
    { q: "重い", a: ["heavy"] },
    { q: "…を動かす", a: ["move"] },
    { q: "…を改善する、上達させる", a: ["improve"] },
    { q: "軽い", a: ["light"] },
    { q: "beginの過去形", a: ["began"] },
    { q: "…を始める", a: ["begin"] },
    { q: "…（を）運ぶ、…を持っていく", a: ["carry"] },
    { q: "ばね、春", a: ["spring"] },
    { q: "…へ", a: ["to"] },
    { q: "結果", a: ["result"] },
    { q: "…でさえ", a: ["even"] },
    { q: "考え、アイディア", a: ["way"] },
    { q: "偉大な、すぐれた", a: ["great"] },
    { q: "よくなる、進歩する", a: ["improve"] },
    { q: "今、ところで、さあ", a: ["now"] },
    { q: "メンバー", a: ["member"] },
    { q: "客、招待客", a: ["guest"] },


    // ===== 3ページ目 =====

    { q: "…に従う、…を守る", a: ["follow"] },
    { q: "規則、ルール", a: ["rule"] },
    { q: "…しなければならない", a: ["must"] },
    { q: "（…を）守る、節約する", a: ["save"] },
    { q: "何も…ない", a: ["nothing"] },
    { q: "…すべきである", a: ["should"] },
    { q: "…を傷つける", a: ["hurt"] },
    { q: "感情、気持ち", a: ["feeling"] },
    { q: "…した、あとで", a: ["after"] },
    { q: "（数えられない名詞について）多くの、多量の", a: ["much"] },
    { q: "多量、たくさん", a: ["much"] },
    { q: "…に答える", a: ["answer"] },
    { q: "…を説明する", a: ["explain"] },
    { q: "feltの過去分詞", a: ["felt"] },
    { q: "…と感じる、気持ちがする", a: ["feel"] },
    { q: "（…で）終わる、終わり、最後", a: ["end"] },
    { q: "（keep …ingで）…し続ける", a: ["keep"] },
    { q: "注意深く", a: ["carefully"] },
    { q: "leftの過去形", a: ["left"] },
    { q: "着く、到着する", a: ["get"] },
    { q: "近い、近くの", a: ["near"] },
    { q: "脱いで", a: ["off"] },
    { q: "別の人（もの）、ほかの人（もの）", a: ["another"] },
    { q: "結婚している女性をさして～さん、先生", a: ["Mrs."] },
    { q: "祝福の言葉、祈り", a: ["wish"] },
    { q: "びん、ボトル", a: ["bottle"] },
    { q: "…にさわる、ふれる", a: ["touch"] },
    { q: "生産する、作る", a: ["produce"] },
    { q: "職員、従業員", a: ["staff"] },
    { q: "…に覆う、…を動力で動かす", a: ["cover"] },
    { q: "紙、用紙", a: ["paper"] },
    { q: "役に立つ、有用な", a: ["useful"] },
    { q: "若い、幼い", a: ["young"] },
    { q: "赤ん坊", a: ["baby"] },
    { q: "次に、今度は", a: ["next"] },
    { q: "確信して", a: ["sure"] },
    { q: "…ということ", a: ["that"] },
    { q: "父", a: ["father"] },
    { q: "…よりも", a: ["than"] },
    { q: "もっと…", a: ["more"] },
    { q: "最も…", a: ["most"] },
    { q: "答え、返事", a: ["answer"] },
    { q: "そのような、このような", a: ["such"] },
    { q: "半分、2分の1", a: ["half"] },
    { q: "よりよい、より良い", a: ["better"] },
    { q: "いちばんよい、いちばん良い", a: ["best"] },
    { q: "…に気がつく、…がわかる", a: ["find"] },
    { q: "【関連】について", a: ["for"] },
    { q: "それから、その後", a: ["then"] },
    { q: "賛成", a: ["yes"] },
    { q: "【比較】と同じくらい…", a: ["as"] },
    { q: "題目、トピック", a: ["topic"] },
    { q: "手紙", a: ["letter"] },
    { q: "さようなら", a: ["goodbye"] },
    { q: "相手の意思をたずねる", a: ["shall"] },
    { q: "（停留所などに）乗る", a: ["change"] },
    { q: "（乗り物などに）乗る", a: ["stop"] },
    { q: "…を取る", a: ["take"] },


    // ===== 4ページ目 =====

    { q: "どちらの、どの", a: ["which"] },
    { q: "競技場、（陸上競技の）フィールド", a: ["field"] },
    { q: "ほとんど", a: ["almost"] },
    { q: "手紙", a: ["letter"] },
    { q: "すっかり、完全に", a: ["up"] },
    { q: "かつて、以前、昔", a: ["once"] },
    { q: "貧しい、かわいそうな", a: ["poor"] },
    { q: "裕福な", a: ["rich"] },
    { q: "…を売る", a: ["sell"] },
    { q: "少しの", a: ["few"] },
    { q: "彼女自身、自ら", a: ["herself"] },
    { q: "今にも…しかけていて", a: ["about"] },
    { q: "気の毒で、かわいそうで", a: ["sorry"] },
    { q: "（代金など）を払う", a: ["pay"] },
    { q: "はなれて、去って", a: ["away"] },
    { q: "思いをめぐらす", a: ["wonder"] },
    { q: "…を望む、…だとよいと思う", a: ["hope"] },
    { q: "【命令文のあとで】そうすれば", a: ["and"] },
    { q: "…する前に", a: ["before"] },
    { q: "以前に、かつて", a: ["before"] },
    { q: "よりよく、より良くなって", a: ["better"] },
    { q: "【形容詞・副詞の比較・最上級】もっと", a: ["much"] },
    { q: "ほほえむ、微笑する", a: ["smile"] },
    { q: "…に～を送る、（人を）行かせる", a: ["send"] },
    { q: "こわがって", a: ["afraid"] },
    { q: "内側に、内部に", a: ["inside"] },
    { q: "通り過ぎて", a: ["by"] },
    { q: "完全", a: ["full"] },
    { q: "年をとった", a: ["old"] },
    { q: "ちょうど、すぐに", a: ["right"] },
    { q: "…と言っている、示している", a: ["say"] },
    { q: "自然の", a: ["natural"] },
    { q: "…を決める", a: ["decide"] },
    { q: "areの原形", a: ["are"] },
    { q: "findの過去分詞", a: ["found"] },
    { q: "受け身の形を作る", a: ["be"] },
    { q: "動作主・動物・もの", a: ["by"] },
    { q: "…に面して", a: ["face"] },
    { q: "原因・動機・～のため、…で", a: ["of"] },
    { q: "…になる", a: ["turn"] },
    { q: "seeの過去分詞", a: ["seen"] },
    { q: "…に上る", a: ["climb"] },
    { q: "材料・費用・…で作った", a: ["of"] },
    { q: "サイズ、寸法", a: ["size"] },
    { q: "値段", a: ["price"] },
    { q: "…を選ぶ、…を買う", a: ["take"] },
    { q: "…未満で", a: ["under"] },
    { q: "…を発展させる", a: ["develop"] },
    { q: "…に反対して", a: ["against"] },
    { q: "特徴、論点、ポイント", a: ["point"] },
    { q: "賛成する、意見が一致する", a: ["agree"] },
    { q: "【支持】…に賛成して", a: ["for"] },
    { q: "【推量】…かもしれない、…だろう", a: ["may"] },
    { q: "【賛成】…に賛成して、味方して", a: ["with"] },
    { q: "中央、真ん中", a: ["middle"] },
    { q: "…を招待する、招く", a: ["invite"] },
    { q: "夢", a: ["dream"] },
    { q: "…を変える", a: ["change"] },
    { q: "（ある状態）になる", a: ["come"] },
    { q: "一生、人生", a: ["life"] },
    { q: "…に字を書く", a: ["write"] },
    { q: "…の中で、…の間で", a: ["among"] },
    { q: "伝統", a: ["tradition"] },
    { q: "…を共有する", a: ["share"] },
    { q: "部分、…の一部", a: ["part"] },
    { q: "【同格】…という、…の", a: ["of"] },
    { q: "帰る、戻る", a: ["return"] },


    // ===== 5ページ目 =====

    { q: "キャンプをする", a: ["camp"] },
    { q: "ひとりで、たった…だけ", a: ["alone"] },
    { q: "自由な", a: ["free"] },
    { q: "生きる", a: ["live"] },
    { q: "驚き、不思議", a: ["wonder"] },
    { q: "十分な、必要なだけの", a: ["enough"] },
    { q: "（…になる）…を失う", a: ["lose"] },
    { q: "島", a: ["island"] },
    { q: "ゆっくりと、遅く", a: ["slowly"] },
    { q: "2倍、2度", a: ["twice"] },
    { q: "地球", a: ["earth"] },
    { q: "過去", a: ["past"] },
    { q: "（…に）手を通す、伝える", a: ["pass"] },
    { q: "as", a: ["as"] },
    { q: "未来の、将来の", a: ["future"] },
    { q: "【質の変化】…になる", a: ["into"] },
    { q: "方法、やり方", a: ["way"] },
    { q: "（時間が）過ぎる、通り過ぎる", a: ["go"] },
    { q: "…するのがこわい", a: ["afraid"] },


    // ===== 6ページ目 =====

    { q: "ラーメン", a: ["ramen"] },
    { q: "即座の、緊急の、（食べ物）が即席の", a: ["instant"] },
    { q: "金色の、すばらしい", a: ["golden"] },
    { q: "シンガポール", a: ["Singapore"] },
    { q: "飛ぶこと、飛行、（飛行機の便）、空の旅", a: ["flight"] },
    { q: "空港、飛行場", a: ["airport"] },
    { q: "シーフード", a: ["seafood"] },
    { q: "予約", a: ["reservation"] },
    { q: "メートル", a: ["meter"] },
    { q: "…の重さがある", a: ["weigh"] },
    { q: "トン", a: ["ton"] },
    { q: "ドル", a: ["dollar"] },
    { q: "連絡する、意思の疎通をする", a: ["communicate"] },
    { q: "中国語、中国の", a: ["Chinese"] },
    { q: "（絵の具でかいた）絵、絵画", a: ["painting"] },
    { q: "かべ", a: ["wall"] },
    { q: "驚いた、びっくりした", a: ["surprised"] },
    { q: "インド", a: ["India"] },
    { q: "モスク、イスラム教寺院", a: ["mosque"] },
    { q: "特に、とりわけ", a: ["especially"] },
    { q: "…を注文する", a: ["order"] },
    { q: "トッピング", a: ["topping"] },
    { q: "いろいろな", a: ["various"] },
    { q: "【独特な味】（香りもふくめた）風味", a: ["flavor"] },
    { q: "塩、食塩", a: ["salt"] },
    { q: "いつか、そのうち", a: ["sometime"] },
    { q: "（～に）…を加える、足す", a: ["add"] },
    { q: "バター", a: ["butter"] },
    { q: "…をベースにした", a: ["-based"] },
    { q: "おすすめの", a: ["recommended"] },
    { q: "製造業者、メーカー", a: ["manufacturer"] },
    { q: "（物事・考えなど）を反映する", a: ["reflect"] },
    { q: "気候", a: ["climate"] },
    { q: "lifeの複数形", a: ["lives"] },
    { q: "創造性[力]、独創性[力]", a: ["creativity"] },
    { q: "シェフ、コック長", a: ["chef"] },
    { q: "変化、変種", a: ["variation"] },
    { q: "イタリア", a: ["Italy"] },
    { q: "…を創造する、つくり出す", a: ["create"] },
    { q: "ソース", a: ["sauce"] },
    { q: "旅行者", a: ["traveler"] },
    { q: "住民、居住者", a: ["resident"] },
    { q: "親切な行為", a: ["favor"] },
    { q: "メニュー", a: ["menu"] },
    { q: "職業", a: ["career"] },
    { q: "保育所、託児所", a: ["nursery"] },
    { q: "メモ、覚え書き", a: ["note"] },
    { q: "（ナイフ、下じき、荷札）", a: ["tag"] },
    { q: "【ふつうchopsticksで食事用の】はし", a: ["chopstick"] },
    { q: "chooseの過去形", a: ["chose"] },
    { q: "色彩の豊かな", a: ["colorful"] },
    { q: "例、挿絵、図、イラスト、説明", a: ["illustration"] },
    { q: "かわいい、きれいな", a: ["pretty"] },


    // ===== 7ページ目 =====

    { q: "（天体の）月", a: ["moon"] },
    { q: "横たえる、置く", a: ["lay"] },
    { q: "（草木の）葉", a: ["leaf"] },
    { q: "ポンと鳴る音", a: ["pop"] },
    { q: "ごく小さい", a: ["caterpillar"] },
    { q: "ポンと鳴る音", a: ["pop"] },
    { q: "洋ナシ", a: ["pear"] },
    { q: "西洋スモモ、プラム", a: ["plum"] },
    { q: "…を調節する", a: ["speed"] },
    { q: "スピード、速度", a: ["sentence"] },
    { q: "文", a: ["clearly"] },
    { q: "はっきりと", a: ["clap"] },
    { q: "（手）をたたく、（人・演技などに）拍手する", a: ["loud"] },
    { q: "心から、本気で、誠実に", a: ["sincerely"] },
    { q: "時刻", a: ["hour"] },
    { q: "キャベツ", a: ["cabbage"] },
    { q: "カリカリした", a: ["crispy"] },
    { q: "おいしい、味がよい", a: ["tasty"] },
    { q: "【時間の管理】", a: ["timekeeping"] },
    { q: "古代の", a: ["ancient"] },
    { q: "エジプト人", a: ["Egyptian"] },
    { q: "putの過去形", a: ["put"] },
    { q: "棒", a: ["stick"] },
    { q: "影", a: ["shadow"] },
    { q: "…をはかる", a: ["measure"] },
    { q: "つぼ、かめ", a: ["pot"] },
    { q: "穴", a: ["hole"] },
    { q: "減る、減少する", a: ["decrease"] },
    { q: "…を燃やす", a: ["burn"] },
    { q: "ろうそく", a: ["candle"] },
    { q: "機械の、機械的な", a: ["mechanical"] },
    { q: "重いもの、おもり", a: ["weight"] },
    { q: "ベルや鐘、かね（の音）", a: ["bell"] },
    { q: "最後には、ようやく", a: ["eventually"] },
    { q: "たぶん、ほぼ", a: ["maybe"] },
    { q: "発明、発明品", a: ["invention"] },
    { q: "努力", a: ["effort"] },
    { q: "（見たり聞いたりして）…とわかる、…を認識する", a: ["recognize"] },
    { q: "科学技術、テクノロジー", a: ["technology"] },
    { q: "知恵、英知", a: ["wisdom"] },
    { q: "ホームステイ", a: ["homestay"] },
    { q: "忠告、助言", a: ["advice"] },
    { q: "（招待して客をもてなす）主人（役）", a: ["host"] },
    { q: "完全な、完ぺきな、適切な", a: ["perfect"] },
    { q: "シャワー", a: ["shower"] },
    { q: "限界、限度、制限", a: ["limit"] },
    { q: "must not", a: ["mustn't"] },
    { q: "年配の", a: ["elderly"] },
    { q: "夫婦", a: ["couple"] },
    { q: "（浅い）取り皿", a: ["plate"] },
    { q: "（場所）に入る", a: ["enter"] },
    { q: "keepの過去形", a: ["kept"] },
    { q: "could not", a: ["couldn't"] },
    { q: "貴重な、大切な", a: ["precious"] },
    { q: "全ての", a: ["universal"] },
    { q: "デザイン", a: ["design"] },
    { q: "博愛な、フェアな", a: ["fair"] },
    { q: "（機械などが）自動式の", a: ["automatic"] },
    { q: "調節可能な", a: ["adjustable"] },
    { q: "公の、公的の", a: ["public"] },
    { q: "施設、設備", a: ["facility"] },
    { q: "（棒・壁などを）軽くたたく", a: ["tap"] },


    // ===== 8ページ目 =====

    { q: "【複数あつかい】カウンター", a: ["counters"] },
    { q: "看板", a: ["sign"] },
    { q: "スロープ", a: ["ramp"] },
    { q: "【stairsで】階段", a: ["stair"] },
    { q: "車いす", a: ["wheelchair] },
    { q: "（旅行などの）手荷物", a: ["baggage"] },
    { q: "発表、プレゼンテーション", a: ["presentation"] },
    { q: "アメリカの、アメリカ人の", a: ["American"] },
    { q: "幼少、幼い頃", a: ["childhood"] },
    { q: "取り除く", a: ["remove"] },
    { q: "障害", a: ["barrier"] },
    { q: "体の不自由な", a: ["disabled"] },
    { q: "何があっても、とにかく", a: ["regardless"] },
    { q: "能力", a: ["ability"] },
    { q: "立場、違う状況、場面", a: ["situation"] },
    { q: "findの過去形", a: ["found"] },
    { q: "中心、中央", a: ["center"] },
    { q: "spreadの過去形", a: ["spread"] },
    { q: "近づきやすい、利用できる", a: ["accessible"] },
    { q: "「はみ出す、広がる」", a: ["spread"] },
    { q: "クイズ", a: ["quiz"] },
    { q: "テニスコートなどのコート", a: ["court"] },
    { q: "調査", a: ["survey"] },
    { q: "カーリング", a: ["Curling"] },
    { q: "戦略、計画、対策", a: ["strategy"] },
    { q: "技能、技術", a: ["skill"] },
    { q: "グラフ、図表", a: ["graph"] },
    { q: "According toで「…によれば」", a: ["according"] },
    { q: "パーセント", a: ["percent"] },
    { q: "結論、決定", a: ["conclusion"] },
    { q: "意見、フィードバック", a: ["feedback"] },
    { q: "話す人、演説者", a: ["speaker"] },
    { q: "話す内容", a: ["content"] },
    { q: "配送、配達", a: ["delivery"] },
    { q: "はっきりした", a: ["clear"] },
    { q: "接触", a: ["contact"] },
    { q: "批評、コメント", a: ["comment"] },
    { q: "speakの過去形", a: ["spoke"] },
    { q: "資料、データ", a: ["data"] },
    { q: "（プレゼンテーション用の）スライド", a: ["slide"] },
    { q: "方向、方角", a: ["direction"] },
    { q: "人工の、人工的な", a: ["artificial"] },
    { q: "芝、芝地", a: ["turf"] },
    { q: "映像、動画", a: ["video"] },
    { q: "特有の、独特な、ただ一つの、唯一の", a: ["unique"] },
    { q: "（belong toで）…に所属する", a: ["belong"] },
    { q: "キャンディー、砂糖菓子", a: ["candy"] },
    { q: "戸別に、1軒ずつ", a: ["door-to-door"] },
    { q: "…をかせぐ", a: ["earn"] },
    { q: "硬貨、コイン", a: ["coin"] },
    { q: "ノックする、コツコツたたく", a: ["knock"] },
    { q: "裕福な", a: ["well-off"] },
    { q: "ポケット", a: ["pocket"] },
    { q: "…と答える", a: ["reply"] },
    { q: "親切、親切な行為", a: ["kindness"] },
    { q: "病気で、具合が悪い", a: ["ill"] },
    { q: "sendの過去形", a: ["sent"] },
    { q: "手術", a: ["operation"] },
    { q: "wakeの過去形", a: ["woke"] },
    { q: "生きて、生きた状態で", a: ["alive"] },
    { q: "封筒", a: ["envelope"] },
    { q: "請求書", a: ["bill"] },
    { q: "支払い済みの", a: ["paid"] },


    // ===== 9ページ目 =====

    { q: "here is", a: ["here's"] },
    { q: "…を選ぶ", a: ["select"] },
    { q: "（文化的な）遺産", a: ["heritage"] },
    { q: "遺跡", a: ["site"] },
    { q: "文化の", a: ["cultural"] },
    { q: "混合した", a: ["mixed"] },
    { q: "選択", a: ["selection"] },
    { q: "基準", a: ["standard"] },
    { q: "一般的な、総合的な、全般的な", a: ["general"] },
    { q: "会議、詳細", a: ["conference"] },
    { q: "すばらしい、すてきな", a: ["fantastic"] },
    { q: "故郷", a: ["hometown"] },
    { q: "花の", a: ["floral"] },
    { q: "地方、地域", a: ["region"] },
    { q: "knownの過去分詞", a: ["known"] },
    { q: "植物", a: ["plant"] },
    { q: "（…の）多様性、相違", a: ["diversity"] },
    { q: "（生物学）その種類・種族", a: ["species"] },
    { q: "buildの過去分詞", a: ["built"] },
    { q: "皇帝", a: ["emperor"] },
    { q: "建築、建築学、建築様式", a: ["architecture"] },
    { q: "…をおおう、包む", a: ["cover"] },
    { q: "大理石", a: ["marble"] },
    { q: "宝石", a: ["jewel"] },
    { q: "原料、材料", a: ["material"] },
    { q: "汚染、汚染物質", a: ["pollution"] },
    { q: "政府", a: ["government"] },
    { q: "…を守る、保護する", a: ["protect"] },
    { q: "表、一覧", a: ["list"] },
    { q: "観光客、旅行者", a: ["tourist"] },
    { q: "日の出", a: ["sunrise"] },
    { q: "噴火口、（隕石の衝突などによる地面の穴）", a: ["crater"] },
    { q: "量、額", a: ["amount"] },
    { q: "「通ってできた小道」", a: ["trail"] },
    { q: "最近、近ごろ", a: ["recently"] },
    { q: "大掃除", a: ["cleanup"] },
    { q: "キャンペーン", a: ["campaign"] },
    { q: "永久に、永遠に", a: ["forever"] },
    { q: "ふろ場、浴室、浴槽、湯ぶね", a: ["bath"] },
    { q: "leaveの過去分詞", a: ["left"] },
    { q: "商品、品物", a: ["goods"] },
    { q: "中くらいの、Mサイズの", a: ["medium"] },
    { q: "店員、フロント係", a: ["clerk"] },
    { q: "客、顧客", a: ["customer"] },
    { q: "討論、話し合い", a: ["discussion"] },
    { q: "chooseの過去分詞", a: ["chosen"] },
    { q: "観光", a: ["tourism"] },
    { q: "産業、工業、…業", a: ["industry"] },
    { q: "増加", a: ["increase"] },
    { q: "…の原因となる、…をひき起こす", a: ["cause"] },
    { q: "（水・空気など）を汚す、汚染する", a: ["pollute"] },
    { q: "環境", a: ["environment"] },
    { q: "それゆえに、したがって、だから", a: ["therefore"] },
    { q: "…を見直す", a: ["review"] },
    { q: "価値", a: ["value"] },
    { q: "…を破壊する", a: ["destroy"] },
    { q: "【人を】ひきつける", a: ["attract"] },
    { q: "可能な、できる", a: ["possible"] },
    { q: "（人を）心配させる", a: ["concern"] },
    { q: "犯罪", a: ["crime"] },
    { q: "due toの「～のために」", a: ["due"] },
    { q: "増加", a: ["increase"] },
    { q: "惑星", a: ["planet"] },
    { q: "写真", a: ["photograph"] },
    { q: "大学", a: ["university"] },
    { q: "ひきつけられる", a: ["attracted"] },


    // ===== 10ページ目 =====

    { q: "荒野", a: ["wilderness"] },
    { q: "市長、町長、村長", a: ["mayor"] },
    { q: "本当の、真実の", a: ["true"] },
    { q: "便利なこと[もの]", a: ["convenience"] },
    { q: "…を狩る、狩りをする", a: ["hunt"] },
    { q: "…を集める、…を一つむ", a: ["gather"] },
    { q: "ベリー", a: ["berry"] },
    { q: "調和して", a: ["harmoniously"] },
    { q: "understandの過去形", a: ["understood"] },
    { q: "生きている", a: ["living"] },
    { q: "becomeの過去形", a: ["became"] },
    { q: "写真家", a: ["photographer"] },
    { q: "厳しい", a: ["severe"] },
    { q: "野生の", a: ["wild"] },
    { q: "ひとりぼっちの、さびしい", a: ["lonely"] },
    { q: "自由", a: ["freedom"] },
    { q: "楽しげな、陽気な", a: ["playful"] },
    { q: "景色、光景", a: ["scene"] },
    { q: "突然、急に", a: ["suddenly"] },
    { q: "…を殺す", a: ["kill"] },
    { q: "氷河", a: ["glacier"] },
    { q: "姿を消す、消滅する", a: ["disappear"] },
    { q: "生息地", a: ["habitat"] },
    { q: "土地", a: ["land"] },
    { q: "残り、その他", a: ["rest"] },
    { q: "…に思い出させる、気づかせる", a: ["remind"] },
    { q: "美しさ、美", a: ["beauty"] }

];

// ======================================
// ゲーム内定数
// ======================================

const MAX_LIFE = 3;
const BONUS_STAGE_RATE = 0.1;   // ボーナスステージの出現率
const BONUS_XP = 40;            // ボーナスステージ正解時の追加XP
const BASE_XP = 10;             // 通常正解のXP
const COMBO_BONUS_STEP = 10;    // このコンボ数ごとにXPボーナスが増える
const COMBO_BONUS_XP = 5;       // コンボボーナスの増加量
const LEVELUP_COIN_REWARD = 10; // レベルアップ時のコイン報酬
const DEFAULT_GOAL = 50;        // 初期の必要XP(Firestoreに未設定の場合)
const DEFAULT_MONSTER = "leaf"; // モンスター種類が未設定の場合のデフォルト
const QUESTIONS_PER_ROUND = 10; // 1ラウンドの出題数

// レベルに応じた進化段階(home.jsのupdateMonster()と同じ基準)
function getMonsterStage(level) {

    if (level >= 80) return 5;
    if (level >= 50) return 4;
    if (level >= 30) return 3;
    if (level >= 10) return 2;
    return 1;

}

// ======================================
// ゲーム状態(このセッションのみ・保存対象外)
// ======================================

let player = null;

let currentQuiz = null;
let combo = 0;
let life = MAX_LIFE;
let correctAnswersCount = 0;
let questionsAnswered = 0;
let roundXPEarned = 0;
let roundCoinsEarned = 0;
let previousCombo = 0; // 前回ラウンド終了時点のコンボ数(継続確認用)
let isBonusStage = false;
let isWaiting = false;

// ======================================
// DOM要素
// ======================================

let els = {};
let revealShowing = false;

function cacheElements() {

    els = {
        lifeContainer: document.getElementById("life-container"),
        comboDisplay: document.getElementById("combo-display"),
        lvNum: document.getElementById("game-lv-num"),
        xpFill: document.getElementById("game-xp-fill"),
        xpText: document.getElementById("game-xp-text"),
        coinText: document.getElementById("game-coin-text-play"),
        xpPopupArea: document.getElementById("game-xp-popup-area"),
        charDisplay: document.getElementById("char-display"),
        qDisplay: document.getElementById("q-display"),
        ansInput: document.getElementById("ans-input"),
        checkBtn: document.getElementById("check-btn"),
        nextBtn: document.getElementById("next-btn"),
        judgeOverlay: document.getElementById("judge-overlay"),
        judgeMark: document.getElementById("judge-mark"),
        bonusStartLogo: document.getElementById("bonus-start-logo"),
        questionCounter: document.getElementById("question-counter"),
        gameoverOverlay: document.getElementById("gameover-overlay"),
        gameoverHomeBtn: document.getElementById("gameover-home-btn"),
        clearOverlay: document.getElementById("clear-overlay"),
        clearCorrect: document.getElementById("clear-correct"),
        clearXp: document.getElementById("clear-xp"),
        clearCoins: document.getElementById("clear-coins"),
        clearHomeBtn: document.getElementById("clear-home-btn"),
        comboContinueOverlay: document.getElementById("combo-continue-overlay"),
        comboContinueYes: document.getElementById("combo-continue-yes"),
        comboContinueNo: document.getElementById("combo-continue-no"),
        answerRevealOverlay: document.getElementById("answer-reveal-overlay"),
        answerRevealGaugeFill: document.getElementById("answer-reveal-gauge-fill"),
        answerRevealText: document.getElementById("answer-reveal-text")
    };

}

// ======================================
// 初期化
// ======================================

// onAuthStateChanged は複数回呼ばれることがあるため、
// ゲームの初期化・イベント登録は最初の1回だけ行う
let hasInitialized = false;

// 読み込みが一定時間で終わらない場合に備えたタイムアウト
// (認証確認やFirestoreの読み込みがハングして、ローディング画面が
//  永遠に回り続けてしまう事態を防ぐための保険)
let loadingTimeoutId = null;

window.addEventListener("DOMContentLoaded", () => {

    console.log("game.js 起動");

    cacheElements();

    if (!els.qDisplay) {

        // ゲーム画面が存在しないページ(このモジュールは game-screen 前提)
        console.log("ゲーム画面が見つかりません。game.jsを終了します。");
        return;

    }

    loadingTimeoutId = setTimeout(() => {

        console.error("読み込みがタイムアウトしました。");
        showLoadingError(hasInitialized ? "timeout (Firestore読み込み中)" : "timeout (ログイン確認中)");

    }, 10000);

    // Firebaseの認証状態が確定するまで待つ
    // (ページ遷移直後は auth.currentUser がまだ null のことがあるため、
    //  onAuthStateChanged を使わずに直接読みに行くとログイン画面に
    //  戻されてしまう)
    onAuthStateChanged(auth, async (user) => {

        if (!user) {

            console.log("未ログインです。ログイン画面に戻ります。");

            if (hasInitialized) {
                // ゲーム中にログアウトされた場合のみ遷移
                hideLoadingOverlay();
                window.location.href = "index.html";
            }

            return;

        }

        if (hasInitialized) return;
        hasInitialized = true;

        try {

            // Firebaseからロード
            player = await loadSaveData();

            if (!player) {

                console.log("プレイヤーデータ取得失敗。ログイン画面に戻ります。");
                hideLoadingOverlay();
                window.location.href = "index.html";
                return;

            }

            // 必要XP(goal)が未設定の場合は初期値を補う
            if (!player.goal) {
                player.goal = DEFAULT_GOAL;
            }

            // モンスターの種類が未設定の場合は初期値を補う
            if (!player.monster) {
                player.monster = DEFAULT_MONSTER;
            }

            // 卵選択が済んでいるかどうかのフラグが未設定の場合、
            // すでにフレンドコードを持つ(=既存の)ユーザーは選択済み扱いにする。
            // フレンドコードが無い完全新規のユーザーはfalse(未選択)にしておく。
            if (player.starterChosen === undefined) {
                player.starterChosen = !!player.friendCode;
            }

            // monsterLevelが未設定の場合はlevelに合わせておく
            // (Firestoreへのupdateはundefinedの値があるとエラーになるため)
            if (!player.monsterLevel) {
                player.monsterLevel = player.level;
            }

            // ガチャで獲得したアイテム一覧が未設定の場合は空配列にしておく
            if (!player.inventory) {
                player.inventory = [];
            }

            // 貯蔵庫(保留中のアイテム)が未設定の場合は空配列にしておく
            if (!player.storage) {
                player.storage = [];
            }

            // コンボが未設定の場合は0にしておく
            if (!player.combo) {
                player.combo = 0;
            }

            // プロフィール項目が未設定の場合のデフォルト値
            if (!player.title) {
                player.title = "";
            }
            if (!player.selfIntro) {
                player.selfIntro = "";
            }
            if (!player.nameChangeCount) {
                player.nameChangeCount = 0;
            }
            if (player.equippedItemId === undefined) {
                player.equippedItemId = null;
            }

            // リロード・再訪問時も前回のコンボを引き継げるように、
            // Firestoreに保存されていたコンボを「継続確認の対象」としてセットしておく。
            // (0ならダイアログは出さず、そのまま0から始まる)
            previousCombo = player.combo;

            // すでにフレンドコードを持っている場合、検索用インデックスに
            // 登録済みか分からないので念のため毎回登録し直しておく
            // (setDocでの上書きなので、すでに登録済みでも問題ない)
            if (player.friendCode) {
                registerFriendCode(player.friendCode, player.accountName);
            }

            console.log("プレイヤーデータ取得成功");

            // home.html側の(まだFirebase化されていない)スクリプトが
            // コイン・レベル等を同じデータとして参照・保存できるように、
            // プレイヤーデータと保存関数を window 経由で公開する。
            // これにより「ゲーム画面のコイン」と「ホーム画面のコイン」が
            // 常に同じ数字になる(同じオブジェクトを見ているだけなので)。
            window.HatchoriaPlayer = player;
            window.HatchoriaSave = { save: saveGame };
            window.dispatchEvent(new Event("hatchoria:playerReady"));

            hideLoadingOverlay();

            // ここでは initializeGame() を呼ばない。
            // (呼ぶとホーム画面にいる間にもボーナス抽選が走ってしまうため。
            //  実際にゲーム画面に入った時だけ hatchoria:enterGame で開始する)

        } catch (error) {

            // 通信エラーなどで読み込みに失敗した場合、
            // ローディング画面が消えないまま固まってしまうのを防ぐ。
            // 再読み込みボタンを出して、ユーザーがやり直せるようにする。
            console.error("プレイヤーデータの読み込みに失敗しました。", error);
            hasInitialized = false;
            showLoadingError((error && (error.code || error.message)) || String(error));

        }

        // イベント登録
        els.checkBtn.addEventListener("click", handleCheck);
        els.nextBtn.addEventListener("click", handleNext);

        els.gameoverHomeBtn.addEventListener("click", () => {

            els.gameoverOverlay.classList.remove("show", "show-text");
            els.gameoverOverlay.style.display = "none";
            window.dispatchEvent(new Event("hatchoria:requestHome"));

        });

        els.clearHomeBtn.addEventListener("click", () => {

            els.clearOverlay.classList.remove("show");
            els.clearOverlay.style.display = "none";
            window.dispatchEvent(new Event("hatchoria:requestHome"));

        });

        els.comboContinueYes.addEventListener("click", () => {

            els.comboContinueOverlay.classList.remove("show");
            initializeGame({ keepCombo: true });

        });

        els.comboContinueNo.addEventListener("click", () => {

            els.comboContinueOverlay.classList.remove("show");
            previousCombo = 0;
            initializeGame({ keepCombo: false });

        });

        window.addEventListener("keydown", (e) => {

            if (e.key !== "Enter") return;

            if (isWaiting) {
                if (!revealShowing) {
                    handleNext();
                }
            } else {
                handleCheck();
            }

        });

    });

});

// screenNav.js から「ゲーム画面に入った」通知を受けたら
// 新しいラウンドを開始する
window.addEventListener("hatchoria:enterGame", () => {

    if (!hasInitialized || !player) return;

    // 前回コンボが残っていれば、継続するか確認するダイアログを出す
    if (previousCombo > 0) {

        els.comboContinueOverlay.classList.add("show");
        return;

    }

    initializeGame();

});

// ======================================
// 初期設定
// ======================================

function initializeGame(options = {}) {

    life = MAX_LIFE;
    combo = options.keepCombo ? previousCombo : 0;
    player.combo = combo;
    correctAnswersCount = 0;
    questionsAnswered = 0;
    roundXPEarned = 0;
    roundCoinsEarned = 0;
    previousCombo = 0;
    revealShowing = false;

    els.gameoverOverlay.classList.remove("show", "show-text");
    els.gameoverOverlay.style.display = "none";
    els.clearOverlay.classList.remove("show");
    els.clearOverlay.style.display = "none";
    els.answerRevealOverlay.classList.remove("show");

    saveGame();

    nextQuestion();
    updateDisplay();

}

// ======================================
// 出題
// ======================================

function nextQuestion() {

    isBonusStage = Math.random() < BONUS_STAGE_RATE;

    if (isBonusStage) {
        showBonusLogo();
    }

    currentQuiz = quizData[Math.floor(Math.random() * quizData.length)];

    els.qDisplay.innerText =
        (isBonusStage ? "★BONUS★ " : "") + currentQuiz.q + " の意味は？";

    els.ansInput.value = "";
    els.ansInput.focus();

    els.checkBtn.style.display = "inline-block";
    els.nextBtn.style.display = "none";

    isWaiting = false;

    updateQuestionCounter();

}

// ======================================
// 「次へ進む」ボタン
// ======================================

function handleNext() {

    if (life <= 0) return;

    if (questionsAnswered >= QUESTIONS_PER_ROUND) {
        finishRound();
        return;
    }

    nextQuestion();
    updateDisplay();

}

// ======================================
// 回答判定
// ======================================

function handleCheck() {

    if (isWaiting) return;

    const value = els.ansInput.value.trim();

    if (!value) return;

    const correct = currentQuiz.a.includes(value);

    if (correct) {

        handleCorrect();

    } else {

        handleWrong();

    }

    questionsAnswered++;
    updateQuestionCounter();

    els.checkBtn.style.display = "none";

    // 不正解の場合は正解表示のあと自動で次に進むので、
    // 「次へ進む」ボタンは正解した時だけ表示する
    if (correct && life > 0) {
        els.nextBtn.style.display = "inline-block";
    }

    isWaiting = true;

    updateDisplay();
    persist();

}

// ======================================
// 正解時の処理
// ======================================

function handleCorrect() {

    showJudgeMark("○");

    combo++;
    player.combo = combo;
    correctAnswersCount++;

    const bonus = getEquippedBonus(player);

    const comboBonus = Math.floor(combo / COMBO_BONUS_STEP) * COMBO_BONUS_XP;
    let gainedXP = BASE_XP + comboBonus;

    let isSpecialPopup = false;

    if (isBonusStage) {

        gainedXP += BONUS_XP;
        isSpecialPopup = true;

    }

    // 装備中アイテムのXPボーナスを適用
    gainedXP = Math.round(gainedXP * (1 + bonus.xpBonus));

    let popupText = `+${gainedXP} XP`;

    if (isBonusStage) {
        popupText = `★BONUS★ +${gainedXP} XP`;
    } else if (combo % COMBO_BONUS_STEP === 0) {
        popupText += ` (🔥${combo}コンボ！)`;
    }

    player.exp += gainedXP;
    roundXPEarned += gainedXP;

    showXpPopup(popupText, isSpecialPopup);

    // レベルアップ判定(コインにも装備ボーナスを適用)
    const levelupCoinReward = Math.round(LEVELUP_COIN_REWARD * (1 + bonus.coinBonus));

    while (player.exp >= player.goal) {

        player.exp -= player.goal;
        player.level++;
        player.goal += 10;
        player.coins += levelupCoinReward;
        roundCoinsEarned += levelupCoinReward;

    }

}

// ======================================
// 不正解時の処理
// ======================================

function handleWrong() {

    showJudgeMark("×");

    combo = 0;
    player.combo = 0;

    life--;

    shakeLife();

    const quiz = currentQuiz;

    showAnswerReveal(quiz, () => {

        if (life <= 0) {
            handleGameOver();
        } else {
            handleNext();
        }

    });

}

// ======================================
// 不正解時: 正解を表示し、ゲージが0になったら自動で次へ進む
// ======================================

function showAnswerReveal(quiz, onDone) {

    revealShowing = true;

    els.answerRevealText.innerText = "正解：" + quiz.a.join("、");

    // 一度幅をリセットしてから、次のフレームでアニメーションを開始する
    // (同じフレーム内で変えると、5秒かけて減っていくのが効かないため)
    els.answerRevealGaugeFill.style.transition = "none";
    els.answerRevealGaugeFill.style.width = "100%";
    void els.answerRevealGaugeFill.offsetWidth;

    els.answerRevealOverlay.classList.add("show");

    requestAnimationFrame(() => {

        els.answerRevealGaugeFill.style.transition = "width 5s linear";
        els.answerRevealGaugeFill.style.width = "0%";

    });

    setTimeout(() => {

        els.answerRevealOverlay.classList.remove("show");
        revealShowing = false;
        onDone();

    }, 5000);

}

// ======================================
// ゲームオーバー
// ======================================

function handleGameOver() {

    els.checkBtn.style.display = "none";
    els.nextBtn.style.display = "none";

    // 画面が2秒かけて黒くフェードし、
    // 完全に暗くなってから GAME OVER の文字とホームボタンを出す
    //
    // display:none → flex と opacity:0 → 1 を同時に行うと
    // ブラウザがアニメーションの開始地点を認識できず、
    // 一瞬で真っ黒になってしまう。
    // そのため、まず表示だけ(透明のまま)行い、
    // 強制的に再描画させてから opacity を変化させることで
    // きちんと2秒かけてフェードするようにしている。
    els.gameoverOverlay.style.display = "flex";
    void els.gameoverOverlay.offsetWidth;
    els.gameoverOverlay.classList.add("show");

    setTimeout(() => {

        els.gameoverOverlay.classList.add("show-text");

    }, 2000);

}

// ======================================
// ラウンド終了(規定数の出題を終えた)
// ======================================

function finishRound() {

    previousCombo = combo;

    els.checkBtn.style.display = "none";
    els.nextBtn.style.display = "none";

    els.clearCorrect.innerText = `正解数：${correctAnswersCount}/${QUESTIONS_PER_ROUND}`;
    els.clearXp.innerText = `獲得XP：${roundXPEarned}xp`;
    els.clearCoins.innerText = `獲得コイン：${roundCoinsEarned}コイン`;

    // display:none → 表示 の間に強制再描画を挟むことで
    // フェード・拡大のトランジションがきちんと効くようにする
    els.clearOverlay.style.display = "flex";
    void els.clearOverlay.offsetWidth;
    els.clearOverlay.classList.add("show");

}

// ======================================
// Firebaseへ保存
// ======================================

async function persist() {

    await saveGame();

}

// ======================================
// 画面表示更新
// ======================================

function updateDisplay() {

    els.lifeContainer.innerText =
        "❤️".repeat(life) + "💔".repeat(MAX_LIFE - life);

    els.comboDisplay.innerText = `🔥×${combo} COMBO!`;

    els.lvNum.innerText = "Lv." + player.level;
    els.xpFill.style.width = (player.exp / player.goal * 100) + "%";
    els.xpText.innerText = `${player.exp}/${player.goal}`;
    els.coinText.innerText = "🪙 " + player.coins;

    const stage = getMonsterStage(player.level);
    updateCharacterImage(stage);

}

// ======================================
// モンスター画像の更新・進化演出
// ======================================

let lastMonsterStage = null; // まだ表示していない

function updateCharacterImage(stage) {

    const newSrc = `assets/images/${player.monster}_${stage}.png`;

    if (lastMonsterStage === null) {

        // 初回表示は演出なしでそのまま表示
        els.charDisplay.innerHTML =
            `<img id="monster-img" src="${newSrc}" alt="character">` +
            `<div id="evolution-flash"></div>`;

    } else if (stage !== lastMonsterStage) {

        playEvolutionAnimation(newSrc);

    } else {

        const img = els.charDisplay.querySelector("img");
        if (img) img.src = newSrc;

    }

    lastMonsterStage = stage;

}

function playEvolutionAnimation(newSrc) {

    const flash = els.charDisplay.querySelector("#evolution-flash");
    const img = els.charDisplay.querySelector("img");

    if (!flash || !img) return;

    // 2秒かけて白く染まっていく
    flash.style.transition = "opacity 2s ease-in";
    flash.style.opacity = "1";

    setTimeout(() => {

        // 真っ白になったタイミングで裏の画像を次の姿に差し替え、
        // 白い球が弾けるようなパーティクル演出を再生する
        img.src = newSrc;

        flash.style.transition = "opacity 0.15s ease-out";
        flash.style.opacity = "0";

        spawnEvolutionBurst();

    }, 2000);

}

function spawnEvolutionBurst() {

    const container = els.charDisplay;

    // 中心から広がる衝撃波(白い球が膨らんで消える)
    const wave = document.createElement("div");
    wave.className = "evo-shockwave";
    container.appendChild(wave);

    const waveAnim = wave.animate([
        { transform: "scale(0.2)", opacity: 1 },
        { transform: "scale(1)", opacity: 1, offset: 0.35 },
        { transform: "scale(3.2)", opacity: 0 }
    ], {
        duration: 600,
        easing: "cubic-bezier(0.1, 0.6, 0.3, 1)"
    });

    waveAnim.onfinish = () => wave.remove();

    // 弾け飛ぶ白い粒子
    const particleCount = 16;

    for (let i = 0; i < particleCount; i++) {

        const p = document.createElement("div");
        p.className = "evo-particle";
        container.appendChild(p);

        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.3 - 0.15);
        const dist = 55 + Math.random() * 45;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;

        const anim = p.animate([
            { transform: "translate(0, 0) scale(1)", opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) scale(0)`, opacity: 0 }
        ], {
            duration: 550 + Math.random() * 250,
            easing: "cubic-bezier(0.15, 0.6, 0.3, 1)"
        });

        anim.onfinish = () => p.remove();

    }

}

// ======================================
// 演出まわり
// ======================================

function showJudgeMark(mark) {

    els.judgeOverlay.style.display = "block";
    els.judgeMark.innerText = mark;
    els.judgeMark.style.color = mark === "○" ? "red" : "#3399ff";

    els.judgeOverlay.classList.remove("show");
    void els.judgeOverlay.offsetWidth;
    els.judgeOverlay.classList.add("show");

    setTimeout(() => {

        els.judgeOverlay.classList.remove("show");
        els.judgeOverlay.style.display = "none";

    }, 1000);

}

function showXpPopup(text, isSpecial) {

    if (!els.xpPopupArea) return;

    els.xpPopupArea.innerHTML = "";

    const pop = document.createElement("div");
    pop.className = isSpecial ? "xp-gain-popup special-bonus" : "xp-gain-popup";
    pop.innerText = text;

    els.xpPopupArea.appendChild(pop);

    setTimeout(() => {
        pop.remove();
    }, 1800);

}

function shakeLife() {

    els.lifeContainer.classList.add("shake-anim");

    setTimeout(() => {
        els.lifeContainer.classList.remove("shake-anim");
    }, 500);

}

function updateQuestionCounter() {

    const remaining = QUESTIONS_PER_ROUND - questionsAnswered;
    els.questionCounter.innerText = `${remaining}/${QUESTIONS_PER_ROUND}`;

}

// ======================================
// 起動時のローディング画面
// ======================================

function hideLoadingOverlay() {

    if (loadingTimeoutId) {
        clearTimeout(loadingTimeoutId);
        loadingTimeoutId = null;
    }

    const overlay = document.getElementById("app-loading-overlay");

    if (!overlay) return;

    overlay.classList.add("hide");

    setTimeout(() => {
        overlay.style.display = "none";
    }, 500);

}

function showLoadingError(detail) {

    if (loadingTimeoutId) {
        clearTimeout(loadingTimeoutId);
        loadingTimeoutId = null;
    }

    const spinner = document.getElementById("app-loading-spinner");
    const text = document.getElementById("app-loading-text");
    const retryBtn = document.getElementById("app-loading-retry-btn");

    if (spinner) spinner.style.display = "none";

    if (text) {
        text.innerText = "読み込みに失敗しました。もう一度お試しください。";

        if (detail) {

            const detailLine = document.createElement("div");
            detailLine.style.fontSize = "12px";
            detailLine.style.fontWeight = "400";
            detailLine.style.marginTop = "8px";
            detailLine.style.color = "#555";
            detailLine.style.wordBreak = "break-all";
            detailLine.innerText = "詳細: " + detail;
            text.appendChild(detailLine);

        }

    }

    if (retryBtn) {

        retryBtn.style.display = "inline-block";
        retryBtn.addEventListener("click", () => {
            location.reload();
        });

    }

}

function showBonusLogo() {

    if (!els.bonusStartLogo) return;

    document.body.classList.add("bonus-active");

    els.bonusStartLogo.classList.remove("bonus-anime-active");
    void els.bonusStartLogo.offsetWidth;
    els.bonusStartLogo.classList.add("bonus-anime-active");

    setTimeout(() => {

        els.bonusStartLogo.classList.remove("bonus-anime-active");
        document.body.classList.remove("bonus-active");

    }, 2500);

}
