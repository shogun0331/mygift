const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

// 1. 디렉토리 경로 탐색
const fRoot = 'F:/';
const charDirName = fs.readdirSync(fRoot).find(d => d.includes('캐릭터')) || '캐릭터';
const charDir = path.join(fRoot, charDirName);
const tinyDirName = fs.readdirSync(charDir).find(d => d.includes('영세기업')) || '영세기업';
const srcDir = path.join(charDir, tinyDirName);

console.log('Source directory:', srcDir);

const eventId = 'event_promote_tiny';
const eventDir = path.join(projectRoot, 'public', 'chapter_assets', 'events', eventId);
const imagesDir = path.join(eventDir, 'images');
const locDir = path.join(eventDir, 'loc');

fs.mkdirSync(imagesDir, { recursive: true });
fs.mkdirSync(locDir, { recursive: true });

// 2. 이미지 매핑 및 복사
const imageMap = {
  '그래픽01_정돈된사무실_e5c5db10.webp': 'promote_tiny_01_tidy_office.webp',
  '그래픽02_문앞사모님_81b7e7a0.webp': 'promote_tiny_02_door_lady.webp',
  '그래픽03_사모님클로즈업_e779a418.webp': 'promote_tiny_03_lady_closeup.webp',
  '그래픽04_문서심사_4366e45c.webp': 'promote_tiny_04_audit_documents.webp',
  '그래픽05_창가사모님_44afe1a2.webp': 'promote_tiny_05_lady_window.webp',
  '그래픽06_서류검토_13d63acc.webp': 'promote_tiny_06_reviewing_papers.webp',
};

const mediaAssets = [];

for (const [srcName, dstName] of Object.entries(imageMap)) {
  const srcFile = path.join(srcDir, srcName);
  const dstFile = path.join(imagesDir, dstName);
  fs.copyFileSync(srcFile, dstFile);
  const stat = fs.statSync(dstFile);
  console.log(`Copied ${srcName} -> ${dstName} (${stat.size} bytes)`);

  mediaAssets.push({
    id: `media_${dstName.replace('.webp', '')}`,
    fileName: dstName,
    kind: 'image',
    sourcePath: `chapter_assets/events/${eventId}/images/${dstName}`,
    url: `media://chapter_assets/events/${eventId}/images/${dstName}`,
    size: stat.size,
  });
}

// 3. 7개 국어 대사 정의
const dialoguesKo = {
  node_01_bg: '배경: 방송국 사무실. 새로운 모니터와 잘 정돈된 책상, 이제 제법 회사다운 분위기가 난다.',
  node_02_pl: '(혼잣말) 드디어... 영세기업까지 올라왔다.',
  node_03_pl: '처음엔 망할 줄 알았는데... 생각보다 잘 돌아가네.',
  node_04_bg: '사무실 문이 열리고, 익숙한 실루엣이 모습을 드러낸다.',
  node_05_ld: '(웃으며) 오랜만이에요, 사장님.',
  node_06_pl: '(깜짝 놀라며) 사모님?! 어... 어떻게 들어오신 거예요?',
  node_07_ld: '(자연스럽게 의자에 앉으며) 저는 이 건물 주인이니까요.',
  node_08_ld: '영세기업... 축하드려요.',
  node_09_ld: '제가 예상한 것보다 훨씬 빠르네요.',
  node_10_pl: '(긴장하며) 감사합니다... 그런데 오늘은 무슨 일로?',
  node_11_ld: '(서류 봉투를 꺼내며) 이제 진짜 시작이에요, 사장님.',
  node_12_bg: '서류 봉투 안에서 계약서, 새로운 규정, 그리고 승급 심사 안내서가 나온다.',
  node_13_ld: '영세기업까지는 누구나 올라올 수 있어요.',
  node_14_ld: '하지만 그 위는 달라요. 중소기업부터는... 심사가 필요해요.',
  node_15_pl: '심사요?',
  node_16_ld: '(고개를 끄덕이며) 네, 심사관이 직접 방문해서 평가하는 거예요.',
  node_17_ld: '만족스러운 결과를 내지 못하면... 다시 내려갈 수도 있어요.',
  node_18_pl: '(긴장하며) 그... 심사는 어떻게 준비해야 하죠?',
  node_19_bg: '사모님이 자리에서 일어나 창밖의 도시 풍경을 바라본다.',
  node_20_ld: '(돌아보며) 걱정 마세요. 당신은 해낼 수 있어요.',
  node_21_ld: '저도 그렇게 믿고 이 방송국을 넘겼으니까.',
  node_22_ld: '(서류를 가리키며) 이제 할 일은... 심사에 맞춰 준비하는 거예요.',
  node_23_ld: '첫 번째 심사는... 중소기업 승급 심사예요.',
  node_24_ld: '그때 봐요, 사장님.',
  node_25_bg: '사모님이 떠난 후, 남겨진 심사 서류들을 천천히 살펴본다.',
  node_26_pl: '(서류를 넘기며) 중소기업 승급 심사...',
  node_27_pl: '...해볼 만하겠네.',
};

const dialoguesEn = {
  node_01_bg: 'Broadcasting office. With new monitors and an organized desk, it finally feels like a real company.',
  node_02_pl: '(To himself) Finally... we made it to Micro Enterprise tier.',
  node_03_pl: 'At first I thought we were doomed... but things are running smoother than expected.',
  node_04_bg: 'The office door swings open, revealing a familiar silhouette.',
  node_05_ld: '(Smiling) Long time no see, CEO.',
  node_06_pl: '(Startled) Madam?! H-how did you get in here?',
  node_07_ld: '(Naturally sitting in a chair) Well, I am the owner of this building, after all.',
  node_08_ld: 'Micro Enterprise... Congratulations.',
  node_09_ld: 'You reached this milestone much faster than I anticipated.',
  node_10_pl: '(Tense) Thank you... But what brings you here today?',
  node_11_ld: '(Taking out an envelope) The real game starts now, CEO.',
  node_12_bg: 'Inside the envelope are contracts, updated regulations, and audit evaluation guidelines.',
  node_13_ld: 'Anyone can make it up to Micro Enterprise.',
  node_14_ld: 'However, the ranks above are different. Starting from Small Enterprise... formal audits are required.',
  node_15_pl: 'Audits?',
  node_16_ld: '(Nodding) Yes, an official auditor will visit in person to evaluate your station.',
  node_17_ld: 'If you fail to deliver satisfactory results... your ranking might get demoted.',
  node_18_pl: '(Nervous) How... how should I prepare for this audit?',
  node_19_bg: 'She stands up from her seat and gazes out the window at the city skyline.',
  node_20_ld: '(Looking back) Do not worry. You have what it takes.',
  node_21_ld: 'I handed this station over to you because I believed in you.',
  node_22_ld: '(Pointing at the documents) What you need to do now... is prepare according to the audit criteria.',
  node_23_ld: 'Your very first trial is... the Small Enterprise Promotion Audit.',
  node_24_ld: 'See you then, CEO.',
  node_25_bg: 'After she leaves, I slowly flip through the audit documents left on the desk.',
  node_26_pl: '(Browsing the papers) Small Enterprise Promotion Audit...',
  node_27_pl: '...This is definitely worth a shot.',
};

const dialoguesJa = {
  node_01_bg: '放送局のオフィス。新しいモニターと整頓されたデスク、ようやく会社らしい雰囲気になってきた。',
  node_02_pl: '（独り言）ついに…零細企業まで上がってきたか。',
  node_03_pl: '最初は潰れるかと思ったが…案外うまく回ってるな。',
  node_04_bg: 'オフィスのドアが開き、見覚えのあるシルエットが姿を現す。',
  node_05_ld: '（微笑んで）お久しぶりね、社長さん。',
  node_06_pl: '（驚いて）マダム？！ど、どうやって入ってきたんですか？',
  node_07_ld: '（自然に椅子に座りながら）私、このビルのオーナーですからね。',
  node_08_ld: '零細企業昇格…おめでとう。',
  node_09_ld: '私の予想よりずっと早かったわね。',
  node_10_pl: '（緊張しながら）ありがとうございます…それで、今日はどんなご用件で？',
  node_11_ld: '（書類の封筒を取り出しながら）ここからが本番よ、社長さん。',
  node_12_bg: '封筒の中から契約書、新しい規定、そして昇格審査の案内書が出てくる。',
  node_13_ld: '零細企業までは誰でも上がってこられるわ。',
  node_14_ld: 'でもその上は違う。中小企業からは…審査が必要になるの。',
  node_15_pl: '審査ですか？',
  node_16_ld: '（頷きながら）ええ、審査官が直接訪れて評価を下すの。',
  node_17_ld: '満足のいく結果を出せなければ…降格することだってあるわ。',
  node_18_pl: '（緊張して）そ、その審査は…どう準備すればいいんでしょうか？',
  node_19_bg: 'マダムが立ち上がり、窓の外の街並みを眺める。',
  node_20_ld: '（振り返りながら）心配しないで。あなたならやり遂げられるわ。',
  node_21_ld: '私もそう信じたからこそ、この放送局を譲ったのだから。',
  node_22_ld: '（書類を指差して）今やるべきことは…審査に合わせて準備を進めることよ。',
  node_23_ld: '最初の関門は…中小企業への昇格審査ね。',
  node_24_ld: 'またその時に会いましょう、社長さん。',
  node_25_bg: 'マダムが去った後、残された審査書類にゆっくりと目を通す。',
  node_26_pl: '（書類をめくりながら）中小企業昇格審査か…',
  node_27_pl: '…やってやる価値はありそうだな。',
};

const dialoguesZh = {
  node_01_bg: '电视台办公室。崭新的显示器与整洁的办公桌，终于有了几分正规公司的氛围。',
  node_02_pl: '（自言自语）终于……晋升到微型企业了。',
  node_03_pl: '一开始还以为要破产了……没想到运转得比想象中顺利。',
  node_04_bg: '办公室大门被推开，熟悉的身影出现在门口。',
  node_05_ld: '（微笑着）好久不见了，社长。',
  node_06_pl: '（大吃一惊）老板娘？！您……您是怎么进来的？',
  node_07_ld: '（自然地在椅子上坐下）因为我是这栋大楼的房东呀。',
  node_08_ld: '晋升微型企业……恭喜你。',
  node_09_ld: '比我预想的速度要快得多呢。',
  node_10_pl: '（有些紧张）谢谢……不过您今天来是有什么事吗？',
  node_11_ld: '（拿出一个文件袋）现在才算真正的开始呢，社长。',
  node_12_bg: '文件袋里装着合同、新规章，以及晋升审查指南。',
  node_13_ld: '到微型企业为止，是谁都能达到的水准。',
  node_14_ld: '但再往上可就完全不同了。从中小型企业开始……必须接受审查。',
  node_15_pl: '审查？',
  node_16_ld: '（点头）是的，会有审查官亲自上门进行综合评估。',
  node_17_ld: '如果无法给出满意的成果……甚至可能会被降级哦。',
  node_18_pl: '（紧张起来）那……审查该怎么准备呢？',
  node_19_bg: '老板娘站起身，若有所思地望着窗外的城市景色。',
  node_20_ld: '（回过头）别担心，你一定能做到的。',
  node_21_ld: '正因为我也深信这一点，当初才把电视台交托给你。',
  node_22_ld: '（指着文件）你现在要做的……就是按照审查标准做好准备。',
  node_23_ld: '你的第一场考验……就是中小型企业晋升审查。',
  node_24_ld: '到时再见吧，社长。',
  node_25_bg: '老板娘离开后，我翻开桌上留下的审查文件仔细查看。',
  node_26_pl: '（翻阅着文件）中小型企业晋升审查吗……',
  node_27_pl: '……值得全力一试。',
};

const dialoguesRu = {
  node_01_bg: 'Офис телестудии. С новыми мониторами и прибранным столом он наконец-то стал похож на настоящую компанию.',
  node_02_pl: '(Про себя) Наконец-то... мы поднялись до ранга Микропредприятия.',
  node_03_pl: 'Сначала я думал, что мы разоримся... но дела идут куда лучше, чем ожидалось.',
  node_04_bg: 'Дверь офиса распахивается, и на пороге появляется знакомый силуэт.',
  node_05_ld: '(С улыбкой) Давно не виделись, директор.',
  node_06_pl: '(Вздрогнув от неожиданности) Госпожа хозяйка?! К-как вы сюда вошли?',
  node_07_ld: '(Непринужденно садясь в кресло) Ну, в конце концов, я владелец этого здания.',
  node_08_ld: 'Микропредприятие... Мои поздравления.',
  node_09_ld: 'Вы достигли этой ступени гораздо быстрее, чем я рассчитывала.',
  node_10_pl: '(Напряженно) Спасибо... Но по какому вы делу сегодня?',
  node_11_ld: '(Доставая конверт с документами) Настоящая игра начинается только сейчас, директор.',
  node_12_bg: 'В конверте лежат контракты, обновленные регламенты и руководство по аттестации.',
  node_13_ld: 'До ранга микропредприятия может дорасти практически любой.',
  node_14_ld: 'Но дальше всё иначе. Начиная с малого бизнеса... потребуется пройти аттестационную проверку.',
  node_15_pl: 'Проверку?',
  node_16_ld: '(Кивая) Да, официальный аудитор лично прибудет для оценки вашей телестудии.',
  node_17_ld: 'Если результаты окажутся неудовлетворительными... вас могут даже понизить в ранге.',
  node_18_pl: '(Нервно) К-как же мне подготовиться к этой проверке?',
  node_19_bg: 'Она встает с кресла и задумчиво смотрит в окно на городской пейзаж.',
  node_20_ld: '(Обернувшись) Не переживайте. У вас всё получится.',
  node_21_ld: 'Я передала эту студию именно вам, потому что верила в ваши силы.',
  node_22_ld: '(Указывая на документы) Всё, что нужно сделать сейчас... подготовиться по критериям аттестации.',
  node_23_ld: 'Ваше первое испытание... аудит на повышение до Малого предприятия.',
  node_24_ld: 'Увидимся тогда, директор.',
  node_25_bg: 'После её ухода я не спеша просматриваю оставленные на столе бумаги.',
  node_26_pl: '(Листая документы) Аттестация на повышение до малого предприятия...',
  node_27_pl: '...Что ж, стоит побороться.',
};

const dialoguesEs = {
  node_01_bg: 'La oficina del estudio. Con nuevos monitores y el escritorio ordenado, por fin parece una empresa de verdad.',
  node_02_pl: '(Para sí mismo) Por fin... hemos ascendido al rango de Microempresa.',
  node_03_pl: 'Al principio creí que nos iríamos a la quiebra... pero esto marcha mucho mejor de lo esperado.',
  node_04_bg: 'La puerta del despacho se abre y se vislumbra una silueta familiar.',
  node_05_ld: '(Sonriendo) Cuánto tiempo sin vernos, director.',
  node_06_pl: '(Sobresaltado) ¡¿Señora dueña?! ¿C-cómo ha entrado aquí?',
  node_07_ld: '(Sentándose con naturalidad en una silla) Bueno, al fin y al cabo soy la dueña de este edificio.',
  node_08_ld: 'Microempresa... Mis felicitaciones.',
  node_09_ld: 'Ha alcanzado esta meta mucho más rápido de lo que esperaba.',
  node_10_pl: '(Tenso) Gracias... Pero ¿a qué se debe su visita hoy?',
  node_11_ld: '(Sacando un sobre con documentos) El verdadero desafío empieza ahora, director.',
  node_12_bg: 'Dentro del sobre hay contratos, normativas actualizadas y una guía de evaluación para la auditoría.',
  node_13_ld: 'Cualquiera puede llegar hasta el nivel de microempresa.',
  node_14_ld: 'Sin embargo, los rangos superiores son distintos. A partir de Pequeña empresa... se exige una auditoría.',
  node_15_pl: '¿Una auditoría?',
  node_16_ld: '(Asintiendo) Sí, un auditor oficial visitará personalmente la emisora para evaluarla.',
  node_17_ld: 'Si no obtiene un resultado satisfactorio... incluso podría sufrir un descenso de categoría.',
  node_18_pl: '(Nervioso) ¿C-cómo debería prepararme para esa auditoría?',
  node_19_bg: 'Ella se levanta de la silla y observa el horizonte de la ciudad a través de la ventana.',
  node_20_ld: '(Mirando hacia atrás) No se preocupe. Tiene la capacidad necesaria para lograrlo.',
  node_21_ld: 'Le traspasé esta emisora precisamente porque confiaba en su talento.',
  node_22_ld: '(Señalando los documentos) Lo que debe hacer ahora... es prepararse según los criterios de evaluación.',
  node_23_ld: 'Su primera gran prueba será... la auditoría de ascenso a Pequeña empresa.',
  node_24_ld: 'Nos vemos entonces, director.',
  node_25_bg: 'Tras marcharse ella, examino con detenimiento los documentos de la auditoría que quedaron sobre la mesa.',
  node_26_pl: '(Hojeando los papeles) Auditoría de ascenso a Pequeña empresa...',
  node_27_pl: '...Sin duda vale la pena intentarlo.',
};

const dialoguesDe = {
  node_01_bg: 'Das Büro des Senders. Mit neuen Monitoren und einem aufgeräumten Schreibtisch fühlt es sich endlich wie ein echtes Unternehmen an.',
  node_02_pl: '(Selbstgespräch) Endlich... haben wir die Stufe des Kleinstunternehmens erreicht.',
  node_03_pl: 'Anfangs dachte ich, wir gehen pleite... aber es läuft erstaunlich gut.',
  node_04_bg: 'Die Bürotür öffnet sich und eine vertraute Gestalt tritt ein.',
  node_05_ld: '(Lächelnd) Lange nicht gesehen, Herr Geschäftsführer.',
  node_06_pl: '(Erschrocken) Frau Besitzerin?! W-wie sind Sie denn hier hereingekommen?',
  node_07_ld: '(Setzt sich ganz selbstverständlich auf einen Stuhl) Nun, mir gehört schließlich das gesamte Gebäude.',
  node_08_ld: 'Kleinstunternehmen... Meinen Glückwunsch.',
  node_09_ld: 'Sie haben diesen Meilenstein viel schneller erreicht, als ich erwartet hatte.',
  node_10_pl: '(Angespannt) Danke... Aber was führt Sie heute zu mir?',
  node_11_ld: '(Zieht einen Umschlag hervor) Jetzt geht das eigentliche Spiel erst los, Herr Geschäftsführer.',
  node_12_bg: 'Im Umschlag befinden sich Verträge, aktualisierte Richtlinien und ein Leitfaden für das Prüfungsverfahren.',
  node_13_ld: 'Bis zum Kleinstunternehmen schafft es so gut wie jeder.',
  node_14_ld: 'Doch ab hier gelten andere Regeln. Ab dem Kleinunternehmen... ist eine offizielle Prüfung erforderlich.',
  node_15_pl: 'Eine Prüfung?',
  node_16_ld: '(Nickt) Ja, ein Prüfer wird persönlich vorbeikommen, um Ihren Sender zu bewerten.',
  node_17_ld: 'Sollten Sie kein zufriedenstellendes Ergebnis erzielen... droht sogar eine Herabstufung.',
  node_18_pl: '(Nervös) W-wie soll ich mich auf diese Prüfung vorbereiten?',
  node_19_bg: 'Sie steht von ihrem Platz auf und blickt aus dem Fenster auf das Stadtpanorama.',
  node_20_ld: '(Blickt zurück) Keine Sorge. Sie haben das Zeug dazu.',
  node_21_ld: 'Ich habe Ihnen diesen Sender anvertraut, weil ich an Sie geglaubt habe.',
  node_22_ld: '(Zeigt auf die Unterlagen) Was Sie jetzt tun müssen... ist, sich genau an den Prüfkriterien zu orientieren.',
  node_23_ld: 'Ihre erste Bewährungsprobe ist... die Aufstiegsprüfung zum Kleinunternehmen.',
  node_24_ld: 'Wir sehen uns dann, Herr Geschäftsführer.',
  node_25_bg: 'Nachdem sie gegangen ist, gehe ich die auf dem Schreibtisch hinterlassenen Prüfungsunterlagen durch.',
  node_26_pl: '(Blättert in den Dokumenten) Aufstiegsprüfung zum Kleinunternehmen...',
  node_27_pl: '...Das ist auf jeden Fall einen Versuch wert.',
};

// 4. 노드 시퀀스 빌드
const nodes = [
  // Scene 1: 정돈된 사무실
  { id: 'graphic_01', type: 'graphic', image: 'promote_tiny_01_tidy_office.webp', delay: 2, blurRegions: [], blurDefault: 4 },
  { id: 'node_01_bg', type: 'text', speakerType: 'narrator', speaker: '', text: dialoguesKo.node_01_bg, text_key: 'node_01_bg' },
  { id: 'node_02_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_02_pl, text_key: 'node_02_pl' },
  { id: 'node_03_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_03_pl, text_key: 'node_03_pl' },

  // Scene 2: 문 앞 사모님
  { id: 'graphic_02', type: 'graphic', image: 'promote_tiny_02_door_lady.webp', delay: 2, blurRegions: [], blurDefault: 4 },
  { id: 'node_04_bg', type: 'text', speakerType: 'narrator', speaker: '', text: dialoguesKo.node_04_bg, text_key: 'node_04_bg' },
  { id: 'node_05_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_05_ld, text_key: 'node_05_ld' },
  { id: 'node_06_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_06_pl, text_key: 'node_06_pl' },
  { id: 'node_07_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_07_ld, text_key: 'node_07_ld' },

  // Scene 3: 사모님 클로즈업
  { id: 'graphic_03', type: 'graphic', image: 'promote_tiny_03_lady_closeup.webp', delay: 2, blurRegions: [], blurDefault: 4 },
  { id: 'node_08_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_08_ld, text_key: 'node_08_ld' },
  { id: 'node_09_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_09_ld, text_key: 'node_09_ld' },
  { id: 'node_10_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_10_pl, text_key: 'node_10_pl' },
  { id: 'node_11_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_11_ld, text_key: 'node_11_ld' },

  // Scene 4: 문서 심사
  { id: 'graphic_04', type: 'graphic', image: 'promote_tiny_04_audit_documents.webp', delay: 2, blurRegions: [], blurDefault: 4 },
  { id: 'node_12_bg', type: 'text', speakerType: 'narrator', speaker: '', text: dialoguesKo.node_12_bg, text_key: 'node_12_bg' },
  { id: 'node_13_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_13_ld, text_key: 'node_13_ld' },
  { id: 'node_14_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_14_ld, text_key: 'node_14_ld' },
  { id: 'node_15_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_15_pl, text_key: 'node_15_pl' },
  { id: 'node_16_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_16_ld, text_key: 'node_16_ld' },
  { id: 'node_17_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_17_ld, text_key: 'node_17_ld' },
  { id: 'node_18_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_18_pl, text_key: 'node_18_pl' },

  // Scene 5: 창가 사모님
  { id: 'graphic_05', type: 'graphic', image: 'promote_tiny_05_lady_window.webp', delay: 2, blurRegions: [], blurDefault: 4 },
  { id: 'node_19_bg', type: 'text', speakerType: 'narrator', speaker: '', text: dialoguesKo.node_19_bg, text_key: 'node_19_bg' },
  { id: 'node_20_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_20_ld, text_key: 'node_20_ld' },
  { id: 'node_21_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_21_ld, text_key: 'node_21_ld' },
  { id: 'node_22_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_22_ld, text_key: 'node_22_ld' },
  { id: 'node_23_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_23_ld, text_key: 'node_23_ld' },
  { id: 'node_24_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_24_ld, text_key: 'node_24_ld' },

  // Scene 6: 서류 검토
  { id: 'graphic_06', type: 'graphic', image: 'promote_tiny_06_reviewing_papers.webp', delay: 2, blurRegions: [], blurDefault: 4 },
  { id: 'node_25_bg', type: 'text', speakerType: 'narrator', speaker: '', text: dialoguesKo.node_25_bg, text_key: 'node_25_bg' },
  { id: 'node_26_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_26_pl, text_key: 'node_26_pl' },
  { id: 'node_27_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_27_pl, text_key: 'node_27_pl' },
];

const allLoc = {
  ko: dialoguesKo,
  en: dialoguesEn,
  ja: dialoguesJa,
  'zh-cn': dialoguesZh,
  ru: dialoguesRu,
  es: dialoguesEs,
  de: dialoguesDe,
};

const eventJson = {
  id: eventId,
  projectId: 'custom',
  projectTitle: '직접 생성',
  chapterId: 1,
  titleKey: eventId,
  title: '영세기업 승급 (사모님의 방문)',
  startNode: 'graphic_01',
  nodes,
  localization: allLoc,
  defaultLanguage: 'ko',
  characters: [
    {
      id: 'owner_lady',
      name: '사모님',
      names: {
        ko: '사모님',
        en: 'Former Owner',
        ja: '前オーナー',
        'zh-cn': '前老板娘',
        ru: 'Бывшая владелица',
        es: 'Ex-propietaria',
        de: 'Ehemalige Besitzerin',
      },
    },
  ],
  points: [],
  media: mediaAssets,
  sourceZipName: '직접 생성',
  createdAt: new Date().toISOString(),
  ownerCharacterId: null, // 공용 이벤트
};

// 5. 파일 저장
fs.writeFileSync(path.join(eventDir, `${eventId}.json`), JSON.stringify(eventJson, null, 2), 'utf-8');
fs.writeFileSync(path.join(projectRoot, 'public', 'chapter_assets', 'events', `${eventId}.json`), JSON.stringify(eventJson, null, 2), 'utf-8');

fs.writeFileSync(path.join(locDir, 'ko.json'), JSON.stringify(dialoguesKo, null, 2), 'utf-8');
fs.writeFileSync(path.join(locDir, 'en.json'), JSON.stringify(dialoguesEn, null, 2), 'utf-8');
fs.writeFileSync(path.join(locDir, 'ja.json'), JSON.stringify(dialoguesJa, null, 2), 'utf-8');
fs.writeFileSync(path.join(locDir, 'zh-cn.json'), JSON.stringify(dialoguesZh, null, 2), 'utf-8');
fs.writeFileSync(path.join(locDir, 'ru.json'), JSON.stringify(dialoguesRu, null, 2), 'utf-8');
fs.writeFileSync(path.join(locDir, 'es.json'), JSON.stringify(dialoguesEs, null, 2), 'utf-8');
fs.writeFileSync(path.join(locDir, 'de.json'), JSON.stringify(dialoguesDe, null, 2), 'utf-8');

console.log('Event JSON and localization files written successfully.');

// 6. events.json 업데이트
const eventsJsonPath = path.join(projectRoot, 'public', 'chapter_assets', 'events.json');
let eventsList = [];
if (fs.existsSync(eventsJsonPath)) {
  eventsList = JSON.parse(fs.readFileSync(eventsJsonPath, 'utf-8'));
}
const metaIdx = eventsList.findIndex(e => e.id === eventId);
const metadata = {
  id: eventId,
  projectId: 'custom',
  projectTitle: '직접 생성',
  chapterId: 1,
  titleKey: eventId,
  title: '영세기업 승급 (사모님의 방문)',
  startNode: 'graphic_01',
  defaultLanguage: 'ko',
  sourceZipName: '직접 생성',
  createdAt: eventJson.createdAt,
  ownerCharacterId: null,
};
if (metaIdx >= 0) {
  eventsList[metaIdx] = metadata;
} else {
  eventsList.unshift(metadata);
}
fs.writeFileSync(eventsJsonPath, JSON.stringify(eventsList, null, 2), 'utf-8');
console.log('Updated events.json');

// 7. common_event_links.json 업데이트 (promoteTiny 슬롯에 연결)
const commonLinksPath = path.join(projectRoot, 'public', 'chapter_assets', 'common_event_links.json');
let commonLinks = {};
if (fs.existsSync(commonLinksPath)) {
  commonLinks = JSON.parse(fs.readFileSync(commonLinksPath, 'utf-8'));
}
commonLinks.promoteTiny = eventId;
fs.writeFileSync(commonLinksPath, JSON.stringify(commonLinks, null, 2), 'utf-8');
console.log('Updated common_event_links.json: promoteTiny ->', eventId);
