# -*- coding: utf-8 -*-
"""사장님=CEO(boss/社長), 마이=Mai/マイ, 귀두=glans/亀頭, 보지=pussy/マンコ, 자지=cock/チンポ"""
TRANS = {
"…30년 살면서 이러는 건, 사장님이 처음이에요. (혀끝을 스치며)":
 {"en":"…In thirty years of living, you're the first to make me do this. (her tongue-tip grazes me)",
  "ja":"…三十年生きてきて、こんなことするのは社長が初めてです。（舌先をすっと当てて）",
  "zh-cn":"…活了三十年，让我这样的，你是第一个。（舌尖轻轻扫过）",
  "ru":"…За тридцать лет жизни такое я делаю впервые — только с тобой, босс. (проводит кончиком языка)",
  "es":"…En treinta años de vida, eres el primero que me hace hacer esto. (roza con la punta de la lengua)",
  "de":"…In dreißig Jahren ist niemand, der mich so weit bringt – nur du, Boss. (streift mit der Zungenspitze)"},
"…… (미소)":
 {"en":"…… (a smile)","ja":"……（微笑）","zh-cn":"……（微笑）","ru":"……（улыбка）","es":"…… (sonrisa)","de":"…… (Lächeln)"},
"…… (숨을 거칠게 몰아쉰다)":
 {"en":"…… (she pants heavily)","ja":"……（息を荒く乱して）","zh-cn":"……（粗重地喘息）","ru":"……（тяжело, прерывисто дышит）","es":"…… (jadea con fuerza)","de":"…… (sie keucht schwer)"},
"…… (허리가 떨린다)":
 {"en":"…… (her hips tremble)","ja":"……（腰が震える）","zh-cn":"……（腰肢颤抖）","ru":"……（бёдра дрожат）","es":"…… (sus caderas tiemblan)","de":"…… (ihre Hüften zittern)"},
"……기억나.":
 {"en":"……I remember.","ja":"……覚えてる。","zh-cn":"……记得。","ru":"……Помню.","es":"……Lo recuerdo.","de":"……Ich erinnere mich."},
"……네. (미소)":
 {"en":"……Yes. (a smile)","ja":"……はい。（微笑）","zh-cn":"……嗯。（微笑）","ru":"……Да. (улыбается)","es":"……Sí. (sonrisa)","de":"……Ja. (Lächeln)"},
"…과분하긴요.":
 {"en":"…Don't flatter me.","ja":"…そんな、私には過分ですよ。","zh-cn":"…哪里哪里。","ru":"…Ну что ты, мне слишком.","es":"…Qué va, soy yo quien no está a tu altura.","de":"…Ach was, das bin ich nicht wert."},
"…나도야. 사랑해, 마이.":
 {"en":"…Me too. I love you, Mai.","ja":"…僕もだよ。愛してる、マイ。","zh-cn":"…我也是。我爱你，玛伊。","ru":"…Я тоже. Люблю тебя, Май.","es":"…Yo también. Te quiero, Mai.","de":"…Ich auch. Ich liebe dich, Mai."},
"…대단하세요.":
 {"en":"…That's amazing.","ja":"…すごいですね。","zh-cn":"…好厉害。","ru":"…Потрясающе.","es":"…Increíble.","de":"…Unglaublich."},
"…도망가긴. (웃음)":
 {"en":"…As if I'd run. (chuckles)","ja":"…逃げるなんて。ふっと笑って","zh-cn":"…跑什么呀。（轻笑）","ru":"…Куда уж бежать. (смеётся)","es":"…Como si fuera a huir. (risa)","de":"…Als würde ich weglaufen. (lacht)"},
"…사장님, 저기요. 신부가 등 뒤에서 이렇게… 흔들리고 있어요.":
 {"en":"…Boss, look. The bride is swaying behind you like this…","ja":"…社長、あの。花嫁が背中の方でこんなに…揺れてますよ。",
  "zh-cn":"…社长，你看。新娘在背后这样…摇动。","ru":"…Босс, смотри. Невеста сзади вот так… покачивается.","es":"…Jefe, mire. La novia se está moviendo así por detrás.","de":"…Boss, schau. Die Braut wiegt sich da hinten so…"},
"…사장님. (거울 속 나를 보며 미소) 뭐, 제가 순백이라… 꽤 웃기죠. 30살에.":
 {"en":"…Boss. (she smiles at me in the mirror) Well, me in pure white… pretty funny, right. At thirty.",
  "ja":"…社長。（鏡の中の私を見て微笑）まあ、私が純白なんて…結構笑えますよね。三十路で。",
  "zh-cn":"…社长。（对着镜中的我微笑）真是的，我这身纯白…挺好笑吧。都三十了。",
  "ru":"…Босс. (улыбается моему отражению) Ну да, я в белоснежном… смешно, правда. В тридцать-то.","es":"…Jefe. (me sonríe en el espejo) Vaya, yo de blanco puro… da risa, ¿no? Con treinta.","de":"…Boss. (lächelt mir im Spiegel zu) Na ja, ich in reinem Weiß… ziemlich komisch, oder. Mit dreißig."},
"…손 내밀길 잘했네요.":
 {"en":"…Good thing I reached out my hand.","ja":"…手を差し出してよかった。","zh-cn":"…幸好我伸出了手。","ru":"…Хорошо, что я тогда протянул руку.","es":"…Menos mal que te tendí la mano.","de":"…Gut, dass ich die Hand ausgestreckt habe."},
"…신부 드레스 안을 이런 식으로 올리는 사람은, 세상에 사장님뿐일 거예요. …뭐, 좋아요. 오늘은 전부 사장님 거니까. (어깨 너머로 시니컬하게 웃으며) …보여요? 신부가 이런 데가, 이렇게 돼버렸네요. 손가락, 아니고… 빨리. 오늘은 시간 없잖아요, 사장님. (뒤돌아보며)":
 {"en":"…You must be the only man in the world who lifts up a bride's dress like this. …Ah, whatever. Today I'm all yours. (a cynical smile over her shoulder) …See? Even here, a bride like me has already gotten like this. Not your fingers… hurry. We don't have time today, boss. (she looks back)",
  "ja":"…花嫁のドレスの中をこんな風にまくる人は、世界中で社長だけでしょうね。…まあ、いいです。今日は全部社長のものですから。（肩越しにシニカルに笑って）…見えます？花嫁のこんな所が、もうこんなになってます。指、じゃなくて…早く。今日は時間がないんですよ、社長。（振り返って）",
  "zh-cn":"…会这样撩起新娘婚纱里面的人，全世界大概只有社长了。…算了，没关系。今天这一切都是社长的。（从肩上露出讽刺的笑）…看到了吗？新娘的这里，已经变成这样了。不是手指…快一点。今天没时间了呀，社长。（回头）",
  "ru":"…Наверное, ты единственный в мире, кто задирает подвздох платья невесты вот так. …Ну и ладно. Сегодня я вся твоя. (цинично усмехается через плечо) …Видишь? У невесты уже всё вот так. Не пальцами… быстрее. Сегодня у нас нет времени, босс. (оглядывается)",
  "es":"…Debes ser el único hombre del mundo que levanta así el interior del vestido de una novia. …Bueno, da igual. Hoy soy toda tuya. (sonrisa cínica por encima del hombro) …¿Lo ves? Una novia ya se ha puesto así aquí. No los dedos… date prisa. Hoy no hay tiempo, jefe. (se vuelve)",
  "de":"…Du musst der einzige Mann der Welt sein, der so unter das Brautkleid fasst. …Ach, egal. Heute gehöre ich ganz dir. (zynisches Lächeln über die Schulter) …Siehst du? Sogar hier ist die Braut schon so. Nicht die Finger… beeil dich. Heute haben wir keine Zeit, Boss. (sieht sich um)"},
"…신부가 예식 전에 이런 짓 하는 거, 하객들은 모르죠. (지퍼를 천천히 내리며)":
 {"en":"…The guests don't know the bride does this before the ceremony. (she slowly pulls down the zipper)",
  "ja":"…花嫁が式前にこんなことをしてるの、参列者は知らないでしょうね。（ゆっくりジッパーを下ろしながら）",
  "zh-cn":"…新郎新妇礼成前做这种事，宾客们不会知道吧。（慢慢拉下拉链）",
  "ru":"…Гости и не знают, что невеста творит такое перед церемонией. (медленно тянет молнию вниз)","es":"…Los invitados no saben que la novia hace esto antes de la ceremonia. (baja despacio la cremallera)","de":"…Die Gäste wissen nicht, dass die Braut das vor der Zeremonie tut. (zieht langsam den Reißverschluss auf)"},
"…아, 깊어요. 사장님… 이제 와서 이렇게… (손끝으로 소파를 움켜쥐며)":
 {"en":"…Ah, so deep. Boss… now, like this… (she grips the sofa with her fingertips)",
  "ja":"…ああ、深いです。社長…今さらこんな…（指先でソファを掴んで）",
  "zh-cn":"…啊，好深。社长…事到如今还这样…（指尖攥紧沙发）",
  "ru":"…Ах, так глубоко. Босс… теперь вот так… (вцепляется пальцами в диван)","es":"…Ah, qué profundo. Jefe… ahora así… (aferra el sofá con las yemas)","de":"…Ah, so tief. Boss… jetzt noch so… (umklammert das Sofa mit den Fingerspitzen)"},
"…안에. 안에 싸줘요. …신부가 부탁하는 거니까. (숨을 거칠게 몰아쉬며)":
 {"en":"…Inside. Finish inside me. …The bride is asking, after all. (she pants heavily)",
  "ja":"…中に。中に出してください。…花嫁がお願いしてるんですから。（息を荒く乱して）",
  "zh-cn":"…里面。射在里面。…因为新娘在求你呀。（粗重地喘息）",
  "ru":"…Внутрь. Кончи внутрь. …Ведь просит сама невеста. (тяжело дыша)","es":"…Dentro. Termina dentro. …Total, lo pide la novia. (jadea fuerte)","de":"…Drin. Komm in mir. …Die Braut bittet ja darum. (keucht)"},
"…약속이에요. (미소)":
 {"en":"…It's a promise. (a smile)","ja":"…約束ですよ。（微笑）","zh-cn":"…说好了。（微笑）","ru":"…Это обещание. (улыбка)","es":"…Es una promesa. (sonrisa)","de":"…Das ist ein Versprechen. (Lächeln)"},
"…여기, 꽉 찼어요. 신부 입이 이래도 되는 건가. (뺨을 누르며 웃음)":
 {"en":"…Here, it's so full. Is it okay for a bride's mouth to be like this. (she laughs, pressing her cheek)",
  "ja":"…ここ、いっぱいです。花嫁の口がこんなでいいんでしょうか。（頬を押して笑って）",
  "zh-cn":"…这里，塞得好满。新娘的嘴可以变成这样吗。（按着脸颊笑）",
  "ru":"…Вот здесь, уже тесно. Нормально ли, что рот невесты такой. (смеётся, прижимаясь щекой)","es":"…Aquí, está lleno. ¿Está bien que la boca de una novia esté así? (ríe apretando la mejilla)","de":"…Hier ist es so voll. Darf der Mund einer Braut so sein. (lacht, drückt die Wange)"},
"…역시, 사장님 옆이 제일 잘 어울리네요. (내 팔짱을 끼며, 작게 속삭인다)":
 {"en":"…As I thought, I suit your side the best. (she hooks her arm through mine and whispers softly)",
  "ja":"…やっぱり、社長の隣が一番似合いますね。（私の腕に絡んで、小さく囁く）",
  "zh-cn":"…果然，还是社长身边最适合我。（挽住我的手臂，轻声低语）",
  "ru":"…Как я и думала, мне больше всего идёт быть рядом с тобой, босс. (берёт меня под руку, тихо шепчет)","es":"…Como pensaba, a tu lado es donde mejor encajo. (se cuelga de mi brazo y susurra bajito)","de":"…Wie ich dachte, an deiner Seite stehe ich am besten. (hakt sich bei mir ein und flüstert leise)"},
"…오늘, 이 드레스… 다 구겨지겠네요. …괜찮아, 괜찮아요.":
 {"en":"…Today this dress… it's going to get all wrinkled. …It's fine, it's fine.","ja":"…今日、このドレス…全部くしゃくちゃになりそうですね。…いいです、いいんです。",
  "zh-cn":"…今天，这件婚纱…要全被弄皱了吧。…没关系，没关系。","ru":"…Сегодня это платье… всё изомнётся. …Ничего, ничего.","es":"…Hoy este vestido… se va a arrugar entero. …Da igual, da igual.","de":"…Heute wird dieses Kleid… ganz zerknittert. …Ist egal, ist egal."},
"…이 녀석, 발로 차는 리듬이 꽤 정확하네요. 역시 내 자식인가 봐요. (배를 쓰다듬으며)":
 {"en":"…This one, its little kicks have quite a rhythm. Just like my kid, I guess. (she strokes her belly)",
  "ja":"…この子、蹴るリズムが結構正確ですね。やっぱり私の子ですね。（お腹を撫でながら）",
  "zh-cn":"…这小家伙，踢人的节奏还挺准的。果然是我的孩子啊。（抚摸肚子）",
  "ru":"…Этот малыш бьётся в таком ритме. Точно мой ребёнок. (поглаживает живот)","es":"…Esta criatura tiene un buen ritmo al patear. Menuda es hija mía. (acaricia su vientre)","de":"…Dieses Kleine tritt in einem ziemlich präzisen Rhythmus. Ganz mein Kind. (streicht über ihren Bauch)"},
"…이제 와서 말하는데. 그날부터 쭉, 좋아했어요. 사장님을.":
 {"en":"…I'll say it now, even if it's late. Since that day, all along… I've loved you, boss.",
  "ja":"…今さらですけど。あの日からずっと、好きでした。社長のことを。",
  "zh-cn":"…虽然现在才说。从那天起，我一直…都喜欢着社长。",
  "ru":"…Скажу, хоть и поздно. С того самого дня — всё время — я любила тебя, босс.","es":"…Lo digo ahora, aunque sea tarde. Desde aquel día, todo el tiempo… te he querido, jefe.","de":"…Ich sage es jetzt, auch wenn es spät ist. Seit jenem Tag, die ganze Zeit… hab ich dich geliebt, Boss."},
"…이제 정말, 도망 못 가겠네요. 사장님. (어깨 너머로, 웃음기 없는 눈으로)":
 {"en":"…Now there's really no running away. Boss. (over her shoulder, with unsmiling eyes)",
  "ja":"…もう本当に、逃げられませんね。社長。（肩越しに、笑みのない目で）",
  "zh-cn":"…现在真的，逃不掉了呢。社长。（越过肩膀，眼神毫无笑意）",
  "ru":"…Теперь уж точно не сбежишь. Босс. (через плечо, глазами без улыбки)","es":"…Ahora de verdad ya no puedes huir. Jefe. (por encima del hombro, con ojos serios)","de":"…Jetzt gibt es wirklich kein Entkommen mehr. Boss. (über die Schulter, mit ernsten Augen)"},
"…저, 한때는 웃기다고 생각했어요. 30살에 결혼, 애까지. 다 늦었다고.":
 {"en":"…You know, I used to think it was funny. Getting married at thirty, even having a kid. That it was all too late.",
  "ja":"…私、昔は笑ってました。三十路で結婚して、子供まで。全部遅すぎるって。",
  "zh-cn":"…我以前觉得这很可笑。三十岁结婚，还生了孩子。一切都太晚了。",
  "ru":"…Знаешь, раньше я считала это смешным. В тридцать — замуж, ещё и ребёнок. Что всё слишком поздно.","es":"…Sabes, antes lo veía gracioso. Casarme con treinta, y hasta con un hijo. Que ya era tarde para todo.","de":"…Weißt du, früher fand ich es lächerlich. Mit dreißig heiraten, und dann auch noch ein Kind. Dass alles zu spät sei."},
"…저도요. 그날 손 내민 게, 제 인생 최고의 선택이었어요.":
 {"en":"…Me too. Reaching out my hand that day was the best choice of my life.",
  "ja":"…私もです。あの日手を差し出したのが、私の人生最高の選択でした。",
  "zh-cn":"…我也是。那天伸出手，是我人生中最好的选择。",
  "ru":"…И я тоже. Протянуть тебе руку в тот день — лучший выбор в моей жизни.","es":"…Yo también. Tendértela aquel día fue la mejor decisión de mi vida.","de":"…Ich auch. Dir an jenem Tag die Hand zu reichen, war die beste Entscheidung meines Lebens."},
"…전부 여기까지. 마지막은, 예식 뒤에요. (시니컬하게 웃으며)":
 {"en":"…Everything stops here. The last part is for after the ceremony. (she smiles cynically)",
  "ja":"…全部ここまで。最後は、式の後ですよ。（シニカルに笑って）",
  "zh-cn":"…一切到此为止。最后的，留到礼成之后吧。（讽刺地笑）",
  "ru":"…Всё до этого места. Последнее — уже после церемонии. (цинично улыбается)","es":"…Todo hasta aquí. Lo último, para después de la ceremonia. (sonríe con cinismo)","de":"…Bis hierher alles. Der Schluss ist für nach der Zeremonie. (lächelt zynisch)"},
"…죽을 때까지, 사장님 곁에서 노래할게요.":
 {"en":"…Until I die, I'll sing at your side, boss.","ja":"…死ぬまで、社長のそばで歌います。","zh-cn":"…直到死去，我都会在社长身边歌唱。","ru":"…До самой смерти буду петь рядом с тобой, босс.","es":"…Hasta que me muera, cantaré a tu lado, jefe.","de":"…Bis ich sterbe, werde ich an deiner Seite singen, Boss."},
"…후회는 늦었어요. 이제 못 도망가요, 사장님. (시니컬한 웃음이 무너지고, 눈가가 붉어진다)":
 {"en":"…It's too late for regrets. You can't run now, boss. (her cynical smile crumbles, and her eyes redden)",
  "ja":"…後悔は遅いですよ。もう逃げられません、社長。（シニカルな笑みが崩れて、目じりが赤くなる）",
  "zh-cn":"…后悔已经来不及了。现在逃不掉了，社长。（讽刺的笑容崩塌，眼眶泛红）",
  "ru":"…Поздно жалеть. Теперь не убежишь, босс. (циничная улыбка тает, глаза краснеют)","es":"…Es tarde para arrepentirse. Ya no puedes huir, jefe. (su sonrisa cínica se quiebra y se le enrojecen los ojos)","de":"…Für Reue ist es zu spät. Du kannst nicht mehr weglaufen, Boss. (sein zynisches Lächeln bricht, die Augen werden rot)"},
"괜찮아요. 저, 하고 싶으니까.":
 {"en":"It's fine. Because I want to.","ja":"大丈夫です。私、したいから。","zh-cn":"没关系。因为我想做。","ru":"Всё в порядке. Я ведь хочу.","es":"Está bien. Porque quiero hacerlo.","de":"Ist schon gut. Weil ich es will."},
"귀두가 보지 입구를 벌리며 천천히 안으로 들어간다.":
 {"en":"My glans spreads her pussy's entrance and slowly sinks in.",
  "ja":"亀頭がマンコの入り口を押し広げながら、ゆっくりと中へ入っていく。",
  "zh-cn":"龟头撑开阴道的入口，缓缓没入。",
  "ru":"Головка раздвигает вход в киску и медленно входит внутрь.","es":"El glande abre la entrada de su coño y se hunde lentamente.","de":"Die Eichel spreizt die Öffnung ihrer Muschi und gleitet langsam hinein."},
"그 말에, 스카웃하던 날이 떠올랐다. 무대 조명 아래, 담배 연기 속에서 혼자 마이크를 잡고 있던 그녀. 내가 손을 내밀었던 그 순간.":
 {"en":"Her words brought back the day I scouted her. Under the stage lights, in the cigarette smoke, she stood alone holding the mic. That moment when I reached out my hand.",
  "ja":"その言葉に、スカウトした日がよみがえった。舞台照明の下、煙草の煙の中で一人マイクを握っていた彼女。私が手を差し出した、あの瞬間。",
  "zh-cn":"那句话，让我想起了当初挖角她的那天。舞台灯光下，烟雾缭绕中独自握着麦克风的她。我伸出手的那一刻。",
  "ru":"От этих слов вспомнился день, когда я её переманил. Под светом сцены, в табачном дыму она одна держала микрофон. Тот миг, когда я протянул ей руку.","es":"Sus palabras me trajeron el día en que la descubrí. Bajo los focos, entre el humo del tabaco, ella sola sujetaba el micrófono. Aquel momento en que le tendí la mano.","de":"Ihre Worte riefen den Tag in Erinnerung, an dem ich sie entdeckte. Unter dem Scheinwerferlicht, im Zigarettenrauch, hielt sie allein das Mikrofon. Genau der Moment, in dem ich ihr die Hand reichte."},
"그건 내가 할 말인데.":
 {"en":"That's my line.","ja":"それは私のセリフですよ。","zh-cn":"那该是我说的话。","ru":"Это мне надо было сказать.","es":"Esa frase es mía.","de":"Das ist meine Zeile."},
"그녀가 뒤돌아 웃었다. 30살의 시니컬한 웃음과 똑같았지만, 그 안에 이제는 확실한 온기가 있었다.":
 {"en":"She turned and smiled. It was the same cynical smile as at thirty, but now there was a certain warmth in it.",
  "ja":"彼女は振り返って笑った。三十路のシニカルな笑みとそっくりだったが、その中にはもう確かな温もりがあった。",
  "zh-cn":"她转过身笑了。和三十岁时一样的讥讽笑容，但其中已然有了确切的温暖。",
  "ru":"Она обернулась и улыбнулась. Улыбка была та же, циничная, как в тридцать, но в ней теперь была ясная теплота.","es":"Se giró y sonrió. Igual que aquella sonrisa cínica de los treinta, pero ahora con una calidez clara dentro.","de":"Sie drehte sich um und lächelte. Es war dasselbe zynische Lächeln wie mit dreißig, doch nun lag eine deutliche Wärme darin."},
"그녀가 천천히 몸을 일으킨다.":
 {"en":"She slowly straightens up.","ja":"彼女がゆっくりと体を起こす。","zh-cn":"她缓缓直起身。","ru":"Она медленно поднимается.","es":"Ella se incorpora despacio.","de":"Sie richtet sich langsam auf."},
"그녀는 고개를 뒤로 빼며, 젖은 입술을 손등으로 닦았다.":
 {"en":"She pulled her head back and wiped her wet lips with the back of her hand.",
  "ja":"彼女は頭を後ろに引いて、濡れた唇を手の甲で拭った。",
  "zh-cn":"她往后缩了缩头，用手背擦了擦湿润的嘴唇。",
  "ru":"Она откинула голову и вытерла влажные губы тыльной стороной ладони.","es":"Retiró la cabeza y se limpió los labios húmedos con el dorso de la mano.","de":"Sie zog den Kopf zurück und wischte sich die feuchten Lippen mit dem Handrücken ab."},
"그녀는 내 앞에 무릎을 꿇었다. 순백의 드레스가 바닥에 원을 그리며 퍼졌다. 신부가 신랑 앞에 무릎 꿇은 모습은, 이 예식장에서 나만 아는 광경이었다.":
 {"en":"She knelt in front of me. Her pure-white dress spread across the floor in a circle. The sight of a bride kneeling before her groom was something only I knew in this wedding hall.",
  "ja":"彼女は私の前にひざまずいた。純白のドレスが床に円を描いて広がった。花嫁が新郎の前にひざまずく姿は、この式場で私だけが知る光景だった。",
  "zh-cn":"她在我的面前跪下。纯白的婚纱在地板上铺开成圆。新娘跪在新郎面前的样子，在这座礼堂里只有我一个人知道。",
  "ru":"Она опустилась передо мной на колени. Белоснежное платье разлилось по полу кругом. То, как невеста стоит на коленях перед женихом, в этом зале знал только я.","es":"Se arrodilló frente a mí. Su vestido blanco se extendió por el suelo formando un círculo. La imagen de la novia de rodillas ante el novio era algo que solo yo conocía en ese salón.","de":"Sie kniete vor mir nieder. Ihr schneeweißes Kleid breitete sich kreisförmig über den Boden. Dass eine Braut vor ihrem Bräutigam kniet, kannte in diesem Saal nur ich."},
"그녀는 대기실 소파에 손을 짚고 엎드렸다. 허리까지 쌓인 드레스 치마를, 내 손이 천천히 걷어 올렸다. 하얀 레이스 속살이 조명 아래 드러났다.":
 {"en":"She bent over, bracing her hands on the sofa of the waiting room. My hand slowly lifted the skirt of the dress piled up to her waist. Her white-laced skin was revealed under the light.",
  "ja":"彼女は控え室のソファに手をついてうつ伏せになった。腰まで重なったドレスのスカートを、私の手がゆっくりとまくり上げた。白いレースの素肌が照明の下に現れた。",
  "zh-cn":"她撑着手，伏在休息室的沙发上。我慢慢掀起堆到腰间的婚纱裙摆。白蕾丝下的肌肤在灯光下显露。",
  "ru":"Она оперлась руками о диван в комнате ожидания и наклонилась. Моя рука медленно задрала юбку платья, собранную до талии. Кожа в белых кружевах открылась под светом.","es":"Se inclinó apoyando las manos en el sofá del vestidor. Mi mano levantó despacio la falda del vestido amontonada hasta la cintura. Su piel de encaje blanco quedó al descubierto bajo la luz.","de":"Sie beugte sich vor und stützte sich auf das Sofa im Wartezimmer. Meine Hand hob langsam den bis zur Taille gestauten Rock des Kleides. Ihre Haut im weißen Spitzenstoff wurde im Licht sichtbar."},
"그녀는 천천히 그것을 입에 물고, 깊숙이 받아들였다. 드레스 위로 흘러내린 머리칼이 손끝에 닿았다. 나는 신부의 머리를 감싸 안았다.":
 {"en":"She slowly took it into her mouth and accepted it deep. Her hair, spilling over the dress, brushed my fingertips. I cradled the bride's head.",
  "ja":"彼女はゆっくりそれを口に含み、深く受け入れた。ドレスの上に流れ落ちた髪が指先に触れた。私は花嫁の頭を包み込んだ。",
  "zh-cn":"她慢慢含住，深深容纳。垂落在婚纱上的发丝触到我的指尖。我轻轻抱住新娘的头。",
  "ru":"Она медленно взяла его в рот и приняла глубоко. Волосы, стекавшие по платью, коснулись моих пальцев. Я обхватил голову невесты.","es":"Lo tomó despacio en su boca y lo aceptó hasta el fondo. El cabello que caía sobre el vestido rozó mis dedos. Sostuve la cabeza de la novia.","de":"Sie nahm es langsam in den Mund und ließ es tief zu. Ihre über das Kleid fallenden Haare streiften meine Fingerspitzen. Ich hielt den Kopf der Braut umschlossen."},
"그녀의 뒤에 무릎을 세우고, 젖은 곳에 귀두를 대었다. 신부가 작게 몸을 떨었다. 나는 천천히 허리를 밀어 넣었다.":
 {"en":"I knelt behind her and pressed my glans to her wetness. The bride gave a small shudder. I slowly pushed my hips in.",
  "ja":"彼女の後ろに膝をついて、濡れた場所に亀頭を当てた。花嫁が小さく身を震わせた。私はゆっくりと腰を押し込んだ。",
  "zh-cn":"我在她身后跪下，将龟头抵在湿润之处。新娘轻轻一颤。我缓缓挺腰进入。",
  "ru":"Я встал на колени позади неё и прижал головку к её влажному месту. Невеста мелко вздрогнула. Я медленно толкнулся бёдрами внутрь.","es":"Me arrodillé tras ella y apoyé el glande en su humedad. La novia dio un pequeño estremecimiento. Empujé despacio con la cadera.","de":"Ich kniete hinter ihr und setzte die Eichel an ihre Feuchte. Die Braut zuckte leicht. Ich stieß langsam mit den Hüften hinein."},
"그녀의 배는 둥글게 부풀어 있었다. 창밖을 보며 흥얼거리는 멜로디는, 우리가 처음 만난 날 그 지하 재즈바에서 부르던 곡이었다.":
 {"en":"Her belly was round and swollen. Humming while gazing out the window, the melody was the song she used to sing in that underground jazz bar the day we first met.",
  "ja":"彼女のお腹は丸く膨らんでいた。窓の外を見ながら口ずさむメロディーは、私たちが初めて会った日、あの地下ジャズバーで歌っていた曲だった。",
  "zh-cn":"她的肚子圆鼓鼓的。望着窗外哼着的旋律，是我们初遇那天，她在那个地下爵士酒吧唱过的歌。",
  "ru":"Её живот округло выпирал. Мелодия, которую она напевала, глядя в окно, была той песней из подземного джаз-бара, где мы встретились в первый день.","es":"Su vientre estaba redondo y abultado. La melodía que tarareaba mirando por la ventana era la canción que cantaba en aquel jazz bar subterráneo el día que nos conocimos.","de":"Ihr Bauch war rund und geschwollen. Die Melodie, die sie aus dem Fenster schauend summte, war das Lied aus jenem Jazzkeller, an dem Tag, als wir uns das erste Mal trafen."},
"그녀의 손이 내 발기한 것을 감싸 쥐었다. 시니컬한 웃음을 띤 채, 고개를 숙여 혀끝으로 귀두를 핥았다. 따뜻하고 젖은 감촉이 허리를 타고 올라왔다.":
 {"en":"Her hand wrapped around my erection. With a cynical smile, she lowered her head and licked the glans with the tip of her tongue. A warm, wet feeling climbed up my spine.",
  "ja":"彼女の手が私の勃起したものを包み込んだ。シニカルな笑みを浮かべたまま、頭を下げて舌先で亀頭を舐めた。温かく濡れた感触が腰を駆け上がってきた。",
  "zh-cn":"她的手裹住我挺立的东西。带着讽刺的笑，低下头用舌尖舔舐龟头。温暖湿润的触感顺着腰攀上来。",
  "ru":"Её рука обхватила моё возбуждение. С циничной улыбкой она наклонилась и лизнула головку кончиком языка. Тёплое влажное ощущение поднялось по спине.","es":"Su mano envolvió mi erección. Con una sonrisa cínica, bajó la cabeza y lamió el glande con la punta de la lengua. Una sensación cálida y húmeda me subió por la espalda.","de":"Ihre Hand umschloss meine Erektion. Mit zynischem Lächeln beugte sie sich herab und leckte die Eichel mit der Zungenspitze. Ein warmes, feuchtes Gefühl stieg mir den Rücken hinauf."},
"근데 사장님, 이거… 늦은 게 아니라, 딱 맞는 거였네요. …우리, 이제 셋이서 노래해요. 사장님. (내 손을 잡아 배 위에 얹으며)":
 {"en":"But boss, this… it wasn't too late. It was exactly right. …Let's sing now, the three of us. Boss. (she takes my hand and lays it on her belly)",
  "ja":"でも社長、これ…遅かったのではなくて、ちょうどよかったんですね。…私たち、もう三人で歌いましょう。社長。（私の手を取ってお腹の上に乗せながら）",
  "zh-cn":"可是社长，这个…不是晚了，而是刚刚好呢。…我们，现在三个人一起唱吧。社长。（握住我的手放到肚子上）",
  "ru":"Но, босс, это… было не поздно, а как раз вовремя. …Давай теперь петь втроём. Босс. (берёт мою руку и кладёт на живот)","es":"Pero jefe, esto… no llegó tarde, sino justo a tiempo. …Cantemos ahora los tres. Jefe. (toma mi mano y la pone sobre su vientre)","de":"Aber Boss, das hier… es war nicht zu spät, sondern genau richtig. …Lass uns jetzt zu dritt singen. Boss. (nimmt meine Hand und legt sie auf ihren Bauch)"},
"내 자지가 그녀의 보지를 뒤에서 밀어 넣는다.":
 {"en":"My cock pushes into her pussy from behind.",
  "ja":"私のチンポが彼女のマンコを後ろから押し込んでいく。",
  "zh-cn":"我的肉棒从后面顶入她的阴道。",
  "ru":"Мой член входит в её киску сзади.","es":"Mi polla entra en su coño por detrás.","de":"Mein Schwanz dringt von hinten in ihre Muschi."},
"내 자지가 그녀의 성기를 천천히 밀고 들어간다.":
 {"en":"My cock slowly pushes into her sex.",
  "ja":"私のチンポが彼女の秘部へゆっくりと押し入っていく。",
  "zh-cn":"我的肉棒缓缓推进她的私处。",
  "ru":"Мой член медленно входит в неё.","es":"Mi polla entra despacio en su sexo.","de":"Mein Schwanz dringt langsam in ihre Mitte ein."},
"내 자지가 그녀의 성기를 천천히 밀어 넣는다.":
 {"en":"My cock slowly pushes into her sex.",
  "ja":"私のチンポが彼女の秘部へゆっくりと押し入っていく。",
  "zh-cn":"我的肉棒缓缓推进她的私处。",
  "ru":"Мой член медленно входит в неё.","es":"Mi polla entra despacio en su sexo.","de":"Mein Schwanz dringt langsam in ihre Mitte ein."},
"내가 물러나자, 그녀가 침대에 누운 채 다리를 벌리고 있다. 정액이 성기에서 흘러나오고, 가슴과 몸 위에도 정액이 묻어 있다.":
 {"en":"As I pull back, she lies on the bed with her legs spread. Semen drips from her sex, and it is smeared across her chest and body.",
  "ja":"私が引くと、彼女はベッドに横たわったまま脚を開いている。精液が秘部から流れ出し、胸や体にも精液がついている。",
  "zh-cn":"我一退开，她躺在床上张着双腿。精液从私处流出，胸口和身体上也沾满了。",
  "ru":"Когда я отстраняюсь, она лежит на кровати, раздвинув ноги. Семя стекает из неё, оно размазано по груди и телу.","es":"Cuando me retiro, ella está tumbada en la cama con las piernas abiertas. El semen se desliza de su sexo y está manchado sobre su pecho y su cuerpo.","de":"Als ich mich zurückziehe, liegt sie mit gespreizten Beinen auf dem Bett. Sperma rinnt aus ihr und klebt an Brust und Körper."},
"드레스가 허리 위로 말려 올라갔다. 팬티는 이미 축축하게 젖어 있었다. 그녀의 허리가 초조한 듯 살짝 움직였다.":
 {"en":"The dress was rolled up above her waist. Her panties were already soaked. Her hips shifted slightly, as if impatient.",
  "ja":"ドレスが腰の上までまくり上がっていた。パンツはもうびっしょり濡れていた。彼女の腰が落ち着かない様子でそっと動いた。",
  "zh-cn":"婚纱被卷到腰上。内裤已经湿透了。她的腰不安地轻轻动了一下。",
  "ru":"Платье задралось выше талии. Трусики уже насквозь промокли. Её бёдра нетерпеливо шевельнулись.","es":"El vestido quedó arremangado por encima de la cintura. Las bragas ya estaban empapadas. Su cadera se movió un poco, como impaciente.","de":"Das Kleid war über die Hüfte gerollt. Das Höschen war schon durchnässt. Ihre Hüften bewegten sich ungeduldig."},
"떨리지 않아?":
 {"en":"Aren't you trembling?","ja":"震えないの？","zh-cn":"不害怕吗？","ru":"Не дрожишь?","es":"¿No estás temblando?","de":"Zitterst du nicht?"},
"마이, 나…":
 {"en":"Mai, I…","ja":"マイ、僕…","zh-cn":"玛伊，我…","ru":"Май, я…","es":"Mai, yo…","de":"Mai, ich…"},
"마이…":
 {"en":"Mai…","ja":"マイ…","zh-cn":"玛伊…","ru":"Май…","es":"Mai…","de":"Mai…"},
"마이… 나, 곧…":
 {"en":"Mai… I'm about to…","ja":"マイ…僕、もう…","zh-cn":"玛伊…我，快要…","ru":"Май… я сейчас…","es":"Mai… estoy a punto de…","de":"Mai… ich bin gleich…"},
"맛있게 해드릴게요.":
 {"en":"I'll make it delicious for you.","ja":"美味しくしてあげますね。","zh-cn":"我会让你尝到美味的。","ru":"Я сделаю это вкусно.","es":"Te lo haré delicioso.","de":"Ich mach es dir köstlich."},
"무대보다 낫네요. …여기선, 박수 안 쳐도 울어주니까.":
 {"en":"Better than a stage. …Here, they cry for you even without applause.",
  "ja":"舞台よりいいですね。…ここでは、拍手しなくても泣いてくれるから。",
  "zh-cn":"比舞台还好。…在这里，就算没有掌声，也会有人为你哭。",
  "ru":"Лучше, чем сцена. …Здесь плачут, даже не аплодируя.","es":"Mejor que un escenario. …Aquí lloran aunque no aplaudan.","de":"Besser als eine Bühne. …Hier weinen sie für dich, auch ohne Applaus."},
"무슨 곡이야?":
 {"en":"What song is it?","ja":"何の曲？","zh-cn":"什么歌？","ru":"Что за песня?","es":"¿Qué canción es?","de":"Welches Lied ist das?"},
"문을 열자, 흰 드레스가 먼저 눈에 들어왔다. 그녀는 거울 속 자신을 보고 있었다. 굽 높은 하이힐에 올려진 다리, 등을 감싸는 레이스, 그리고 어깨를 타고 내려오는 검은 머리카락.":
 {"en":"When I opened the door, the white dress caught my eye first. She was looking at herself in the mirror. Legs raised on high heels, lace wrapping her back, and black hair flowing down her shoulders.",
  "ja":"扉を開けると、白いドレスが真っ先に目に入った。彼女は鏡の中の自分を見ていた。ヒールの高い靴にのせた脚、背中を包むレース、そして肩を伝って流れる黒い髪。",
  "zh-cn":"推开门，最先映入眼帘的是白色婚纱。她正看着镜中的自己。踩在高跟鞋上的双腿、缠绕后背的蕾丝，以及垂落肩头的黑发。",
  "ru":"Когда я открыл дверь, первым делом в глаза бросилось белое платье. Она смотрела на себя в зеркало. Ноги на высоких каблуках, кружево, обнимающее спину, и чёрные волосы, стекающие по плечам.","es":"Al abrir la puerta, lo primero que vi fue el vestido blanco. Ella se miraba en el espejo. Las piernas sobre unos tacones altos, el encaje envolviéndole la espalda y el pelo negro cayéndole por los hombros.","de":"Als ich die Tür öffnete, fiel mir zuerst das weiße Kleid ins Auge. Sie betrachtete sich im Spiegel. Beine auf hohen Absätzen, Spitze um ihren Rücken und schwarzes Haar, das über die Schultern fällt."},
"뭐, 30살이 웨딩드레스 입고 '좋아했어요'라니. 좀 웃기지만. …사랑해요.":
 {"en":"Well, a thirty-year-old in a wedding dress saying 'I loved you'. A bit funny. …I love you.",
  "ja":"まあ、三十路がウェディングドレス着て『好きでした』なんて。ちょっと笑えますけど。…愛してます。",
  "zh-cn":"真是的，三十岁的人穿着婚纱说'一直都喜欢'。有点好笑。…我爱你。",
  "ru":"Ну, в тридцать лет в свадебном платье говорить «я тебя любила». Забавно. …Я тебя люблю.","es":"Vaya, una mujer de treinta con vestido de novia diciendo 'te quise'. Un poco gracioso. …Te quiero.","de":"Na ja, mit dreißig im Brautkleid zu sagen ›ich hab dich geliebt‹. Etwas komisch. …Ich liebe dich."},
"버진로드 끝에서, 그녀가 나를 향해 걸어왔다. 흰 장갑을 낀 손에 부케를 들고. 그 무대 위 재즈싱어가, 이제 신부로 내 앞에 서 있었다.":
 {"en":"At the end of the aisle, she walked toward me. Holding a bouquet in her white-gloved hand. That jazz singer from the stage now stood before me as a bride.",
  "ja":"ヴァージンロードの先で、彼女が私に向かって歩いてきた。白い手袋の手にブーケを抱えて。あの舞台の上のジャズシンガーが、今は花嫁として私の前に立っていた。",
  "zh-cn":"红毯尽头，她向我走来。戴着白手套的手捧着花束。那位舞台上的爵士歌手，此刻作为新娘站在我面前。",
  "ru":"В конце дорожки она шла ко мне. В руке в белой перчатке — букет. Та джазовая певица со сцены теперь стояла передо мной как невеста.","es":"Al final del pasillo, ella caminó hacia mí. Sosteniendo un ramo en su mano enguantada de blanco. Aquella cantante de jazz del escenario ahora estaba ante mí como novia.","de":"Am Ende des Gangs kam sie auf mich zu. In ihrer weiß behandschuhten Hand einen Blumenstrauß. Jene Jazzsängerin von der Bühne stand nun als Braut vor mir."},
"병들 때도, 가난할 때도… 뭐, 우린 이미 재즈바에서 더한 것도 다 봤으니까요.":
 {"en":"Through sickness, through poverty… Well, we've already seen worse than this in the jazz bar.",
  "ja":"病気の時も、貧しい時も…まあ、私たちはもうジャズバーでそれ以上のことも全部見てきたから。",
  "zh-cn":"生病的时候，贫穷的时候…其实，我们在爵士酒吧里已经见过比这更糟的了。",
  "ru":"И в болезни, и в бедности… Ну, мы ведь в джаз-баре уже всякое видели.","es":"En la enfermedad, en la pobreza… Bueno, ya hemos visto cosas peores en el jazz bar.","de":"In Krankheit, in Armut… Naja, wir haben im Jazzbar schon Schlimmeres gesehen."},
"사장님이 그날 손 안 내밀었으면, 전 아직도 그 지하에서 술값이나 벌고 있었겠죠.":
 {"en":"If you hadn't reached out your hand that day, I'd still be down in that basement earning drink money.",
  "ja":"社長があの日手を差し出さなければ、私はまだあの地下で酒代でも稼いでいたでしょうね。",
  "zh-cn":"如果那天社长没有伸出手，我现在大概还在那个地下室里挣酒钱吧。",
  "ru":"Если бы ты не протянул руку в тот день, я до сих пор зарабатывала бы на выпивку в том подвале.","es":"Si no me hubieras tendido la mano aquel día, seguiría en ese sótano ganándome el dinero de las copas.","de":"Hättest du mir an jenem Tag nicht die Hand gereicht, würde ich noch immer in diesem Keller mein Trinkgeld verdienen."},
"서약을 올리며, 그녀는 나를 똑바로 바라보았다. 그 시니컬한 눈빛이, 오늘만큼은 부드럽게 녹아 있었다. '네.' 하고 대답하는 내 목소리가, 오르간 소리에 겹쳐 울려 퍼졌다.":
 {"en":"As we exchanged vows, she looked straight at me. That cynical gaze, for once today, melted soft. My voice answering 'Yes' rang out, layered over the organ.",
  "ja":"誓いを立てながら、彼女は私をまっすぐ見つめた。そのシニカルな眼差しが、今日だけは柔らかく溶けていた。「はい」と答える私の声が、オルガンの音に重なって響き渡った。",
  "zh-cn":"交换誓词时，她直直望着我。那讥讽的目光，唯独在今天温柔地融化了。我回答'我愿意'的声音，与管风琴声交叠回响。",
  "ru":"Произнося клятвы, она смотрела прямо на меня. Этот циничный взгляд лишь сегодня растопился мягко. Мой голос, ответивший «да», прозвучал, сливаясь с органом.","es":"Al intercambiar los votos, me miró fijamente. Esa mirada cínica, solo por hoy, se derritió suave. Mi voz respondiendo 'sí' resonó, fundiéndose con el órgano.","de":"Beim Austausch der Gelübde sah sie mir direkt in die Augen. Dieser zynische Blick war nur heute sanft geschmolzen. Meine Stimme, die mit ›Ja‹ antwortete, hallte, überlagert von der Orgel."},
"아…… 나온다……! (허리가 떨리며 정액을 쏟아낸다)":
 {"en":"Ah…… I'm coming……! (her hips tremble as I spill my seed)",
  "ja":"あ……出る……！（腰が震えて精を放つ）",
  "zh-cn":"啊……要出来了……！（腰肢颤抖着射了出来）",
  "ru":"Ах…… сейчас……! (бёдра дрожат, я изливаюсь)","es":"Ah…… voy a… ¡(le tiemblan las caderas al derramarme)!","de":"Ah…… ich komme……! (ihre Hüften zittern, während ich mich ergieße)"},
"아…… 마이… (손으로 그녀의 머리를 감싼다)":
 {"en":"Ah…… Mai… (I cup her head with my hand)",
  "ja":"あ……マイ…（手で彼女の頭を包む）",
  "zh-cn":"啊……玛伊…（用手托住她的头）",
  "ru":"Ах…… Май… (обхватываю её голову ладонью)","es":"Ah…… Mai… (le sostengo la cabeza con la mano)","de":"Ah…… Mai… (ich umfasse ihren Kopf mit der Hand)"},
"아뇨. 사장님 수트요. …역시, 재즈바 구석에서 노래만 하던 여자한테는 과분한 남자죠.":
 {"en":"No, it's your suit. …As I thought, a man who's too good for a woman who only ever sang in a corner of a jazz bar.",
  "ja":"いいえ、社長のスーツですよ。…やっぱり、ジャズバーの隅で歌ってただけの女には、もったいない男ですね。",
  "zh-cn":"不是，是社长的西装。…果然，对只在爵士酒吧角落里唱歌的女人来说，是太过奢侈的男人啊。",
  "ru":"Нет, это твой костюм, босс. …Как и думала, мужчина, слишком хороший для женщины, что лишь пела в углу джаз-бара.","es":"No, es tu traje, jefe. …Como pensaba, un hombre demasiado para una mujer que solo cantaba en un rincón del jazz bar.","de":"Nein, es ist dein Anzug, Boss. …Wie ich dachte, ein Mann, der zu gut ist für eine Frau, die nur in der Ecke eines Jazzbars sang."},
"왔어요. …예쁘네요. 정말.":
 {"en":"You came. …So beautiful. Really.","ja":"来てくれたんですね。…きれいですね。本当に。",
  "zh-cn":"你来了。…真美。真的。","ru":"Ты пришёл. …Как красиво. Правда.","es":"Has venido. …Qué bonito. De verdad.","de":"Du bist gekommen. …So schön. Wirklich."},
"웃기긴. 누구보다 어울리는데.":
 {"en":"Funny, you say. You wear it better than anyone.","ja":"笑えるって。誰より似合ってますよ。",
  "zh-cn":"有什么好笑的。比谁都适合。","ru":"Смешно, говоришь. Тебе идёт больше, чем кому-либо.","es":"Gracioso, dices. Te sienta mejor que a nadie.","de":"Komisch, sagst du. Es steht dir besser als jedem anderen."},
"으… 마이, 안쪽까지…":
 {"en":"Mmh… Mai, so deep…","ja":"ん…マイ、奥まで…","zh-cn":"唔…玛伊，到最里面…","ru":"Мхм… Май, так глубоко…","es":"Mmh… Mai, hasta el fondo…","de":"Mmh… Mai, so tief…"},
"으…… (허리를 깊이 내민다)":
 {"en":"Mmh…… (she arches her hips deep)",
  "ja":"ん……（腰を深く差し出して）",
  "zh-cn":"唔……（深深地挺起腰）",
  "ru":"Мхм…… (глубоко подаётся бёдрами)","es":"Mmh…… (arquea profundamente las caderas)","de":"Mmh…… (sie bietet ihre Hüften tief an)"},
"으읏… 마이…":
 {"en":"Hah… Mai…","ja":"んんっ…マイ…","zh-cn":"唔嗯…玛伊…","ru":"Мхм… Май…","es":"Ugh… Mai…","de":"Ngh… Mai…"},
"이렇게 예쁜 신부를, 그냥 둘 순 없잖아.":
 {"en":"I can't just leave a bride this beautiful alone.",
  "ja":"こんなにきれいな花嫁を、放っておけないでしょう。",
  "zh-cn":"这么漂亮的新娘，怎么能放着不管。",
  "ru":"Такую красивую невесту нельзя просто так оставить.","es":"No puedo dejar sola a una novia tan bonita.","de":"So eine schöne Braut kann man doch nicht einfach stehen lassen."},
"이제, 뒤에서 해주세요, 고객님.":
 {"en":"Now, please do it from behind, sir.","ja":"では、後ろからお願いします、お客様。",
  "zh-cn":"那么，请从后面来吧，客人。",
  "ru":"Теперь, пожалуйста, сзади, господин.","es":"Ahora, por favor, desde atrás, caballero.","de":"Jetzt bitte von hinten, mein Herr."},
"질벽이 뜨겁게 죄어 왔다. 리듬에 맞춰 그녀의 허리가 흔들렸다. 드레스는 어깨까지 흘러내렸고, 흔들릴 때마다 가슴이 레이스 안에서 요동쳤다.":
 {"en":"Her vaginal walls clenched hotly around me. Her hips swayed to the rhythm. The dress had slipped down to her shoulders, and with every movement her breasts shook inside the lace.",
  "ja":"膣壁が熱く締め付けてきた。リズムに合わせて彼女の腰が揺れた。ドレスは肩まで落ちて、揺れるたびに胸がレースの中で揺れた。",
  "zh-cn":"阴道壁灼热地绞紧。她的腰随着节奏摆动。婚纱滑落至肩头，每一下颤动，胸乳都在蕾丝中晃动。",
  "ru":"Её стенки горячо сжимали меня. Бёдра качались в такт. Платье сползло до плеч, и с каждым движением грудь колыхалась в кружевах.","es":"Sus paredes me apretaron con calor. Su cadera se mecía al ritmo. El vestido había resbalado hasta los hombros y, con cada vaivén, sus pechos se movían dentro del encaje.","de":"Ihre Vaginalwände umschlangen mich heiß. Ihre Hüften wiegten sich im Rhythmus. Das Kleid war bis auf die Schultern gerutscht, und bei jeder Bewegung schwankten ihre Brüste im Spitzenstoff."},
"처음 만난 날, 사장님이 듣고 있던 곡요. …기억나요?":
 {"en":"It's the song you were listening to the day we first met. …Do you remember?",
  "ja":"初めて会った日、社長が聴いていた曲です。…覚えてますか？",
  "zh-cn":"是初遇那天社长在听的歌。…还记得吗？",
  "ru":"Это песня, которую ты слушал в день нашей первой встречи. …Помнишь?","es":"Es la canción que escuchabas el día que nos conocimos. …¿Lo recuerdas?","de":"Es das Lied, das du am Tag unserer ersten Begegnung gehört hast. …Erinnerst du dich?"},
"고객님의… 전부… (몸을 떤다)":
 {"en":"All of it, sir… everything… (she trembles)",
  "ja":"お客様の…全部…（体を震わせて）",
  "zh-cn":"客人的…全部…（身体颤抖）",
  "ru":"Всё… от вас, господин… (дрожит)","es":"Todo suyo… todo… (tiembla)","de":"Alles von Ihnen… alles… (sie zittert)"},
"고급 호텔 프라이빗 수영장. 미야자와 리나가 먼저 도착해 기다리고 있다.":
 {"en":"A private pool at a luxury hotel. Miyazawa Rina has arrived first and is waiting.",
  "ja":"高級ホテルのプライベートプール。宮沢リナが先に着いて待っている。",
  "zh-cn":"高级酒店的私人泳池。宫泽里奈先到，正等着。",
  "ru":"Частный бассейн в роскошном отеле. Миядзава Рина уже пришла и ждёт.","es":"Una piscina privada en un hotel de lujo. Miyazawa Rina ha llegado primero y espera.","de":"Ein privater Pool in einem Luxushotel. Miyazawa Rina ist zuerst da und wartet."},
"그녀가 내 바지를 천천히 내린다.":
 {"en":"She slowly pulls down my pants.","ja":"彼女が私のズボンをゆっくり下ろす。",
  "zh-cn":"她慢慢脱下我的裤子。","ru":"Она медленно спускает мои брюки.","es":"Ella me baja despacio los pantalones.","de":"Sie zieht mir langsam die Hose herunter."},
"그녀가 내 앞에 무릎을 꿇고, 내 바지를 천천히 내린다.":
 {"en":"She kneels before me and slowly pulls down my pants.",
  "ja":"彼女が私の前にひざまずいて、私のズボンをゆっくり下ろす。",
  "zh-cn":"她在我面前跪下，慢慢脱下我的裤子。",
  "ru":"Она опускается передо мной на колени и медленно спускает мои брюки.","es":"Se arrodilla ante mí y me baja despacio los pantalones.","de":"Sie kniet vor mir nieder und zieht mir langsam die Hose herunter."},
"그녀의 안에 정액을 쏟아낸다.":
 {"en":"I spill my seed inside her.","ja":"彼女の中に精を放つ。","zh-cn":"在她体内射精。",
  "ru":"Я изливаюсь в неё.","es":"Me derramo dentro de ella.","de":"Ich ergieße mich in ihr."},
"내 바지를 천천히 내린다.":
 {"en":"I slowly pull down my pants.","ja":"私のズボンをゆっくり下ろす。",
  "zh-cn":"我慢慢脱下自己的裤子。","ru":"Я медленно спускаю свои брюки.","es":"Me bajo despacio los pantalones.","de":"Ich ziehe mir langsam die Hose herunter."},
"내 자지가 그녀의 성기를 뒤에서 밀어 넣는다.":
 {"en":"My cock pushes into her sex from behind.",
  "ja":"私のチンポが彼女の秘部を後ろから押し入れていく。",
  "zh-cn":"我的肉棒从后面顶进她的私处。",
  "ru":"Мой член входит в неё сзади.","es":"Mi polla entra en su sexo por detrás.","de":"Mein Schwanz dringt von hinten in ihre Mitte ein."},
"넣어. 내 안에…":
 {"en":"Put it in. Inside me…","ja":"入れて。私の中に…","zh-cn":"进来。到我里面…",
  "ru":"Входи. Внутрь…","es":"Entra. Dentro de mí…","de":"Tu es rein. In mich…"},
"넣어요, 사장님.":
 {"en":"Put it in, boss.","ja":"入れてください、社長。","zh-cn":"请进来，社长。",
  "ru":"Войди, босс.","es":"Entra, jefe.","de":"Tu es rein, Boss."},
"넣어주세요, 사장님.":
 {"en":"Please put it in, boss.","ja":"入れてください、社長。","zh-cn":"请进来，社长。",
  "ru":"Войди, пожалуйста, босс.","es":"Por favor, entra, jefe.","de":"Bitte tu es rein, Boss."},
"넣어주세요.":
 {"en":"Please put it in.","ja":"入れてください。","zh-cn":"请进来。",
  "ru":"Войди, пожалуйста.","es":"Por favor, entra.","de":"Bitte tu es rein."},
"넣어주세요. 제 안에…":
 {"en":"Please put it in. Inside me…","ja":"入れてください。私の中に…",
  "zh-cn":"请进来。到我里面…","ru":"Войди. Внутрь меня…","es":"Por favor, entra. Dentro de mí…","de":"Bitte tu es rein. In mich…"},
"넣어주세요. 제 안에… (엉덩이를 더 든다)":
 {"en":"Please put it in. Inside me… (she raises her hips higher)",
  "ja":"入れてください。私の中に…（お尻をさらに上げて）",
  "zh-cn":"请进来。到我里面…（把臀部抬得更高）",
  "ru":"Войди. Внутрь меня… (приподнимает бёдра выше)","es":"Por favor, entra. Dentro de mí… (levanta más las caderas)","de":"Bitte tu es rein. In mich… (sie hebt die Hüften höher)"},
"눈을 감고, 자지를 깊이 받아들인다.":
 {"en":"She closes her eyes and takes the cock deep.","ja":"目を閉じて、チンポを深く受け入れる。",
  "zh-cn":"闭上眼睛，深深含入。","ru":"Закрывает глаза и глубоко принимает его.","es":"Cierra los ojos y lo acepta hasta el fondo.","de":"Sie schließt die Augen und nimmt den Schwanz tief auf."},
"맛있게 해드릴게요. (혀를 내밀어 귀두를 핥는다)":
 {"en":"I'll make it delicious for you. (she sticks out her tongue and licks the glans)",
  "ja":"美味しくしてあげますね。（舌を出して亀頭を舐めて）",
  "zh-cn":"我会让你尝到美味的。（伸出舌头舔舐龟头）",
  "ru":"Я сделаю это вкусно. (высовывает язык и лижет головку)","es":"Te lo haré delicioso. (saca la lengua y lame el glande)","de":"Ich mach es dir köstlich. (streckt die Zunge heraus und leckt die Eichel)"},
"사장… 나도…":
 {"en":"Boss… me too…","ja":"社長…僕も…","zh-cn":"社长…我也…",
  "ru":"Босс… я тоже…","es":"Jefe… yo también…","de":"Boss… ich auch…"},
"사장님… 저도…":
 {"en":"Boss… me too…","ja":"社長…私も…","zh-cn":"社长…我也是…",
  "ru":"Босс… я тоже…","es":"Jefe… yo también…","de":"Boss… ich auch…"},
"사장님… 저도… (몸이 활처럼 휜다)":
 {"en":"Boss… me too… (her body arches like a bow)",
  "ja":"社長…私も…（体が弓のようにしなる）",
  "zh-cn":"社长…我也是…（身体弓起如弦）",
  "ru":"Босс… я тоже… (тело выгибается, как лук)","es":"Jefe… yo también… (su cuerpo se arquea como un arco)","de":"Boss… ich auch… (ihr Körper wölbt sich wie ein Bogen)"},
"시라카와 씨… 저… 곧… (숨을 헐떡인다)":
 {"en":"Ms. Shirakawa… I… I'm about to… (he pants)",
  "ja":"白河さん…私…もう…（息を切らして）",
  "zh-cn":"白河小姐…我…快要…（喘息着）",
  "ru":"Госпожа Сиракава… я… сейчас… (задыхаясь)","es":"Sra. Shirakawa… yo… estoy a punto… (jadeando)","de":"Frau Shirakawa… ich… gleich… (keuchend)"},
"아… 나온다…!":
 {"en":"Ah… I'm coming…!","ja":"あ…出る…！","zh-cn":"啊…要出来了…！",
  "ru":"Ах… сейчас…!","es":"Ah… voy a…!","de":"Ah… ich komme…!"},
"아…… 미야자와 씨…":
 {"en":"Ah… Ms. Miyazawa…","ja":"あ……宮沢さん…","zh-cn":"啊……宫泽小姐…",
  "ru":"Ах… госпожа Миядзава…","es":"Ah… Sra. Miyazawa…","de":"Ah… Frau Miyazawa…"},
"입에 넣을게요. (입을 벌려 귀두를 물어 넣는다)":
 {"en":"I'll take it in my mouth. (she opens her mouth and takes the glans in)",
  "ja":"口に入れますね。（口を開けて亀頭を咥える）",
  "zh-cn":"我会放进嘴里。（张开嘴含入龟头）",
  "ru":"Возьму в рот. (открывает рот и берёт головку в рот)","es":"Lo tomaré en mi boca. (abre la boca y lo mete)","de":"Ich nehme es in den Mund. (öffnet den Mund und nimmt die Eichel auf)"},
"좋아요. 그럼.":
 {"en":"Okay. Then…","ja":"いいですよ。それじゃあ。","zh-cn":"好。那…",
  "ru":"Хорошо. Тогда…","es":"Está bien. Entonces…","de":"Okay. Dann…"},
"침실. 미야자와 리나가 침대에 눕고, 다리를 벌린다. 완전히 벗은 맨몸이다.":
 {"en":"The bedroom. Miyazawa Rina lies on the bed and spreads her legs. She is completely naked.",
  "ja":"寝室。宮沢リナがベッドに横たわり、脚を開く。完全に裸だ。",
  "zh-cn":"卧室。宫泽里奈躺在床上张开双腿。一丝不挂。",
  "ru":"Спальня. Миядзава Рина ложится на кровать и раздвигает ноги. Она полностью обнажена.","es":"El dormitorio. Miyazawa Rina se tumba en la cama y abre las piernas. Está completamente desnuda.","de":"Das Schlafzimmer. Miyazawa Rina legt sich aufs Bett und spreizt die Beine. Sie ist völlig nackt."},
}
if __name__ == "__main__":
    import json
    print("번역 항목:", len(TRANS))
