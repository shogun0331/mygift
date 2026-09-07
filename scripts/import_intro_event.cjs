const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

// 1. 디렉토리 경로 탐색
const fRoot = 'F:/';
const charDirName = fs.readdirSync(fRoot).find(d => d.includes('캐릭터')) || '캐릭터';
const charDir = path.join(fRoot, charDirName);
const stationDirName = fs.readdirSync(charDir).find(d => d.includes('방송국')) || '방송국';
const srcDir = path.join(charDir, stationDirName);

console.log('Source directory:', srcDir);

const eventId = 'event_intro_station';
const eventDir = path.join(projectRoot, 'public', 'chapter_assets', 'events', eventId);
const imagesDir = path.join(eventDir, 'images');
const locDir = path.join(eventDir, 'loc');

fs.mkdirSync(imagesDir, { recursive: true });
fs.mkdirSync(locDir, { recursive: true });

// 2. 이미지 복사 매핑 (실제 파일명 매칭)
const imageMap = {
  '그래픽01_외부건물밤_ae1be7e1.webp': 'intro_01_building_rain.webp',
  '그래픽02_리셉션복도_c46c6318.webp': 'intro_02_reception_hallway.webp',
  '그래픽03_사모님사무실_d7c211a2.webp': 'intro_03_owner_lady_office.webp',
  '그래픽04_장비담배_dcb11e2e.webp': 'intro_04_studio_posters.webp',
  '그래픽05_컴퓨터서류_1920be8e.webp': 'intro_05_pc_past_broadcasts.webp',
  '그래픽06_사인도장_51f158b7.webp': 'intro_06_sign_contract_stamp.webp',
  '그래픽07_빈사무실_d1296d20.webp': 'intro_07_office_sunrise_alone.webp',
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

// 3. 시나리오 노드 및 대사 정의
const dialoguesKo = {
  // 그래픽 1
  node_01_bg: '배경: 도시 외곽, 비 오는 밤, 낡은 방송국 건물. 빗물이 흘러내리는 간판, 흔들리는 네온사인 "스타라이트 방송국".',
  node_02_pl: '...여기였나.',
  node_03_pl: '우연히 본 채용 공고 하나에 이끌려 왔지만, 딱 봐도 망하기 직전인데...',
  node_04_pl: '내가 뭘 잘못 본 건가?',
  // 그래픽 2
  node_05_bg: '건물 내부, 먼지 쌓인 리셉션, 어두운 복도.',
  node_06_pl: '(기침하며) 여보세요? 계신가요?',
  node_07_ld: '(안쪽에서) 어머, 드디어 오셨군요!',
  // 그래픽 3
  node_08_bg: '사무실 안, 책상 위 서류 더미가 가득하고 의자에 앉은 50대 여성이 미소를 짓고 있다.',
  node_09_ld: '저는 이 방송국의 전 소유주예요.',
  node_10_ld: '이제 이 방송국은 당신 거예요.',
  node_11_pl: '잠깐만요... 전 그냥 지원하러 왔는데요?',
  node_12_ld: '(웃으며) 그래요? 그런데 당신이 마음에 들었어요.',
  node_13_ld: '월급 대신... 방송국을 드릴게요.',
  node_14_pl: '네?!',
  // 그래픽 4
  node_15_bg: '낡은 방송 장비, 카메라, 조명, 그리고 벽에 붙은 포스터들... 섹시한 컨셉의 여성들이다.',
  node_16_ld: '(담배에 불을 붙이며) 이 방송국은... 평범한 방송국이 아니에요.',
  node_17_ld: '성인 방송국이죠. 그래서 직원들이 다 도망갔어요.',
  node_18_ld: '하지만... 이게 돈이 되는 시대예요. 당신도 알잖아요?',
  node_19_pl: '(당황하며) 성인... 방송국이라고요?',
  // 그래픽 5
  node_20_bg: '컴퓨터 화면에는 과거에 방송되었던 자극적인 영상 썸네일들이 띄워져 있다.',
  node_21_ld: '(서류를 건네며) 걱정 마세요. 지금은 아무도 없지만...',
  node_22_ld: '당신이 직접 크리에이터를 찾아오면 돼요. 스카우트, 아세요?',
  node_23_ld: '당신은 그냥... 그녀들이 편하게 방송할 수 있는 환경만 만들어주면 돼요.',
  node_24_ld: '계약서에 사인하시죠?',
  node_25_pl: '(잠시 망설이다) ...해볼게요.',
  // 그래픽 6
  node_26_bg: '계약서에 사인을 마치자, 붉은색 인장이 묵직하게 찍힌다.',
  node_27_ld: '(일어서며) 잘 선택하셨어요, 사장님.',
  node_28_ld: '방송국은 인수하셨으니... 이제 할 일은 하나예요.',
  node_29_ld: '크리에이터를 찾아 나서는 거죠.',
  // 그래픽 7
  node_30_bg: '사모님이 떠난 후, 홀로 남은 사무실 창문으로 새벽빛이 희미하게 비쳐온다.',
  node_31_pl: '(한숨) 성인방송국이라...',
  node_32_pl: '(컴퓨터를 켜며) 어쨌든... 이제 내가 사장인 건가.',
  node_33_pl: '(결심한 듯) 좋아. 크리에이터부터 찾아보자.',
  node_34_pl: '스카웃... 나가야겠네.',
};

const dialoguesEn = {
  node_01_bg: 'Outskirts of the city, a rainy night, an old broadcast studio building. Rain drips down the sign, a flickering neon reads "Starlight Broadcasting".',
  node_02_pl: '...Is this the place?',
  node_03_pl: 'I came here after seeing a recruitment ad, but this place looks like it\'s about to go bankrupt...',
  node_04_pl: 'Did I come to the wrong place?',
  node_05_bg: 'Inside the building, dusty reception desk, dim and quiet hallway.',
  node_06_pl: '(Coughs) Hello? Is anyone here?',
  node_07_ld: '(From inside) Oh my, you\'re finally here!',
  node_08_bg: 'Inside the office, stacks of documents fill the desk, and a woman in her 50s sits in a chair smiling.',
  node_09_ld: 'I\'m the former owner of this broadcasting station.',
  node_10_ld: 'From now on, this station belongs to you.',
  node_11_pl: 'Wait a moment... I just came here applying for a job?',
  node_12_ld: '(Smiles) Is that so? But I really like you.',
  node_13_ld: 'Instead of a salary... I\'ll give you the entire station.',
  node_14_pl: 'What?!',
  node_15_bg: 'Old broadcast equipment, cameras, lights, and posters on the walls... featuring glamorous and sexy women.',
  node_16_ld: '(Lights a cigarette) This station... isn\'t your typical broadcasting network.',
  node_17_ld: 'It\'s an adult broadcasting station. That\'s why all the previous staff ran away.',
  node_18_ld: 'However... this is where the real money is nowadays. You know that too, right?',
  node_19_pl: '(Flustered) An adult... broadcasting station?',
  node_20_bg: 'On the computer screen, thumbnails of past provocative live streams are displayed.',
  node_21_ld: '(Hands over documents) Don\'t worry. There\'s no one here right now, but...',
  node_22_ld: 'You can scout and recruit creators yourself. You know about scouting, right?',
  node_23_ld: 'All you need to do... is create an environment where they can stream comfortably.',
  node_24_ld: 'Will you sign the contract?',
  node_25_pl: '(Hesitates a moment) ...I\'ll do it.',
  node_26_bg: 'As the signature is finalized, a red seal is firmly stamped onto the contract.',
  node_27_ld: '(Stands up) A wise choice, CEO.',
  node_28_ld: 'Now that you\'ve acquired the station... there\'s only one thing left to do.',
  node_29_ld: 'Go out and scout your creators.',
  node_30_bg: 'After she leaves, alone in the quiet office, the faint morning dawn shines through the window.',
  node_31_pl: '(Sighs) An adult broadcasting station, huh...',
  node_32_pl: '(Turns on the PC) Well... I guess I\'m really the boss now.',
  node_33_pl: '(Determined) Alright. Let\'s start by looking for creators.',
  node_34_pl: 'Time to go scouting.',
};

const dialoguesJa = {
  node_01_bg: '都市の郊外、雨の降る夜、古びた放送局の建物。雨水が滴る看板、明滅するネオンサイン「スターライト放送局」。',
  node_02_pl: '…ここか。',
  node_03_pl: '偶然見かけた求人広告に引かれて来てみたが、どう見ても潰れかけだな…',
  node_04_pl: '見間違いだったか？',
  node_05_bg: '建物内部、埃の積もった受付、薄暗い廊下。',
  node_06_pl: '（咳払いをしながら）すみません、どなたかいらっしゃいますか？',
  node_07_ld: '（奥から）あら、やっと来てくれたのね！',
  node_08_bg: 'オフィスの中、デスクの上には書類の山。椅子に座った50代の女性が微笑んでいる。',
  node_09_ld: '私はこの放送局の前オーナーよ。',
  node_10_ld: '今日からこの放送局はあなたのものよ。',
  node_11_pl: 'ちょっと待ってください…僕はただ応募しに来ただけなんですが？',
  node_12_ld: '（微笑んで）そう？でもあなたが気に入ったの。',
  node_13_ld: '給料の代わりに…この放送局をあげるわ。',
  node_14_pl: 'えっ？！',
  node_15_bg: '古びた放送機材、カメラ、照明、そして壁に貼られたポスター…セクシーな女性たちの姿。',
  node_16_ld: '（煙草に火をつけながら）この放送局はね…普通の放送局じゃないの。',
  node_17_ld: '成人向け放送局よ。だから前のスタッフたちはみんな逃げ出しちゃったわ。',
  node_18_ld: 'でも…今の時代、これが一番稼げるのよ。あなたも分かってるでしょう？',
  node_19_pl: '（戸惑いながら）成人向け…放送局ですか？',
  node_20_bg: 'パソコンの画面には、過去に配信された刺激的な動画のサムネイルが並んでいる。',
  node_21_ld: '（書類を手渡しながら）心配いらないわ。今は誰もいないけれど…',
  node_22_ld: 'あなたが直接クリエイターを探してくればいいの。スカウトって知ってるでしょ？',
  node_23_ld: 'あなたはただ…彼女たちが配信しやすい環境を整えてあげるだけでいいの。',
  node_24_ld: '契約書にサインしてくれるかしら？',
  node_25_pl: '（少し迷ったあと）…やってみます。',
  node_26_bg: '契約書にサインを終えると、赤い印鑑がずっしりと押される。',
  node_27_ld: '（立ち上がりながら）いい決断ね、社長さん。',
  node_28_ld: '放送局を引き継いだ以上…やるべきことは一つよ。',
  node_29_ld: 'クリエイターを探しに行くことね。',
  node_30_bg: 'マダムが去った後、一人残されたオフィスに、夜明けの光がかすかに差し込んでくる。',
  node_31_pl: '（ため息）成人向け放送局か…',
  node_32_pl: '（パソコンの電源を入れて）ともかく…これで俺が社長ってわけか。',
  node_33_pl: '（決意を込めて）よし。まずはクリエイターを探そう。',
  node_34_pl: 'スカウトに…出かけるとするか。',
};

const dialoguesZh = {
  node_01_bg: '城市郊外，雨夜，陈旧的电视台大楼。雨水顺着招牌滑落，闪烁的霓虹灯写着“星光电视台”。',
  node_02_pl: '……是这里吗。',
  node_03_pl: '虽然是顺着偶然看到的招聘广告过来的，但怎么看都像是快倒闭了……',
  node_04_pl: '是我看错了吗？',
  node_05_bg: '大楼内部，落满灰尘的前台，昏暗的走廊。',
  node_06_pl: '（咳嗽着）请问有人在吗？',
  node_07_ld: '（从里面传来）哎呀，你终于来了！',
  node_08_bg: '办公室内，桌上堆满了文件，坐在椅子上的50多岁女性微笑着。',
  node_09_ld: '我是这家电视台的前老板。',
  node_10_ld: '从现在开始，这家电视台属于你了。',
  node_11_pl: '等等……我只是来应聘的啊？',
  node_12_ld: '（笑着）是吗？但我很看好你。',
  node_13_ld: '代替薪水……我把这家电视台送给你。',
  node_14_pl: '什么？！',
  node_15_bg: '陈旧的直播设备、摄像机、灯光，以及墙上贴着的海报……全是性感风格的女性。',
  node_16_ld: '（点上一支烟）这家电视台……可不是普通的电视台。',
  node_17_ld: '是成人电视台。所以员工们都跑光了。',
  node_18_ld: '但是……现在这个时代这才是赚钱的。你也知道吧？',
  node_19_pl: '（慌张地）成、成人电视台？',
  node_20_bg: '电脑屏幕上显示着过去直播过的具有刺激性的视频缩略图。',
  node_21_ld: '（递过文件）别担心，虽然现在空无一人……',
  node_22_ld: '只要你亲自去寻找创作者就行了。知道星探/招募吧？',
  node_23_ld: '你只要……为她们打造一个能安心直播的环境就好。',
  node_24_ld: '在合同上签字吧？',
  node_25_pl: '（稍作迟疑）……我试试看。',
  node_26_bg: '在合同上签完字，沉重地盖上了红色的印章。',
  node_27_ld: '（站起身）明智的选择，社长。',
  node_28_ld: '既然接手了电视台……接下来要做的事只有一件。',
  node_29_ld: '去寻找创作者吧。',
  node_30_bg: '老板娘离开后，独自一人的办公室内，晨光微弱地透过窗户洒进来。',
  node_31_pl: '（叹气）成人电视台啊……',
  node_32_pl: '（打开电脑）不管怎样……我现在是社长了吗。',
  node_33_pl: '（下定决心）好，先从寻找创作者开始吧。',
  node_34_pl: '该去……招募了。',
};

// RU, ES, DE 폴백 생성
const dialoguesRu = { ...dialoguesEn };
const dialoguesEs = { ...dialoguesEn };
const dialoguesDe = { ...dialoguesEn };

// 4. 노드 시퀀스 빌드
const nodes = [
  // Scene 1: 비 오는 건물 밖
  { id: 'graphic_01', type: 'graphic', image: 'intro_01_building_rain.webp', delay: 2, blurRegions: [], blurDefault: 4 },
  { id: 'node_01_bg', type: 'text', speakerType: 'narrator', speaker: '', text: dialoguesKo.node_01_bg, text_key: 'node_01_bg' },
  { id: 'node_02_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_02_pl, text_key: 'node_02_pl' },
  { id: 'node_03_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_03_pl, text_key: 'node_03_pl' },
  { id: 'node_04_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_04_pl, text_key: 'node_04_pl' },

  // Scene 2: 리셉션 복도
  { id: 'graphic_02', type: 'graphic', image: 'intro_02_reception_hallway.webp', delay: 2, blurRegions: [], blurDefault: 4 },
  { id: 'node_05_bg', type: 'text', speakerType: 'narrator', speaker: '', text: dialoguesKo.node_05_bg, text_key: 'node_05_bg' },
  { id: 'node_06_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_06_pl, text_key: 'node_06_pl' },
  { id: 'node_07_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_07_ld, text_key: 'node_07_ld' },

  // Scene 3: 사모님 사무실
  { id: 'graphic_03', type: 'graphic', image: 'intro_03_owner_lady_office.webp', delay: 2, blurRegions: [], blurDefault: 4 },
  { id: 'node_08_bg', type: 'text', speakerType: 'narrator', speaker: '', text: dialoguesKo.node_08_bg, text_key: 'node_08_bg' },
  { id: 'node_09_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_09_ld, text_key: 'node_09_ld' },
  { id: 'node_10_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_10_ld, text_key: 'node_10_ld' },
  { id: 'node_11_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_11_pl, text_key: 'node_11_pl' },
  { id: 'node_12_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_12_ld, text_key: 'node_12_ld' },
  { id: 'node_13_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_13_ld, text_key: 'node_13_ld' },
  { id: 'node_14_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_14_pl, text_key: 'node_14_pl' },

  // Scene 4: 스튜디오와 포스터
  { id: 'graphic_04', type: 'graphic', image: 'intro_04_studio_posters.webp', delay: 2, blurRegions: [], blurDefault: 4 },
  { id: 'node_15_bg', type: 'text', speakerType: 'narrator', speaker: '', text: dialoguesKo.node_15_bg, text_key: 'node_15_bg' },
  { id: 'node_16_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_16_ld, text_key: 'node_16_ld' },
  { id: 'node_17_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_17_ld, text_key: 'node_17_ld' },
  { id: 'node_18_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_18_ld, text_key: 'node_18_ld' },
  { id: 'node_19_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_19_pl, text_key: 'node_19_pl' },

  // Scene 5: 컴퓨터 화면과 과거 영상
  { id: 'graphic_05', type: 'graphic', image: 'intro_05_pc_past_broadcasts.webp', delay: 2, blurRegions: [], blurDefault: 4 },
  { id: 'node_20_bg', type: 'text', speakerType: 'narrator', speaker: '', text: dialoguesKo.node_20_bg, text_key: 'node_20_bg' },
  { id: 'node_21_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_21_ld, text_key: 'node_21_ld' },
  { id: 'node_22_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_22_ld, text_key: 'node_22_ld' },
  { id: 'node_23_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_23_ld, text_key: 'node_23_ld' },
  { id: 'node_24_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_24_ld, text_key: 'node_24_ld' },
  { id: 'node_25_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_25_pl, text_key: 'node_25_pl' },

  // Scene 6: 계약서 사인
  { id: 'graphic_06', type: 'graphic', image: 'intro_06_sign_contract_stamp.webp', delay: 2, blurRegions: [], blurDefault: 4 },
  { id: 'node_26_bg', type: 'text', speakerType: 'narrator', speaker: '', text: dialoguesKo.node_26_bg, text_key: 'node_26_bg' },
  { id: 'node_27_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_27_ld, text_key: 'node_27_ld' },
  { id: 'node_28_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_28_ld, text_key: 'node_28_ld' },
  { id: 'node_29_ld', type: 'text', speakerType: 'character', speaker: 'owner_lady', text: dialoguesKo.node_29_ld, text_key: 'node_29_ld' },

  // Scene 7: 홀로 남은 사무실
  { id: 'graphic_07', type: 'graphic', image: 'intro_07_office_sunrise_alone.webp', delay: 2, blurRegions: [], blurDefault: 4 },
  { id: 'node_30_bg', type: 'text', speakerType: 'narrator', speaker: '', text: dialoguesKo.node_30_bg, text_key: 'node_30_bg' },
  { id: 'node_31_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_31_pl, text_key: 'node_31_pl' },
  { id: 'node_32_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_32_pl, text_key: 'node_32_pl' },
  { id: 'node_33_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_33_pl, text_key: 'node_33_pl' },
  { id: 'node_34_pl', type: 'text', speakerType: 'player', speaker: 'player', text: dialoguesKo.node_34_pl, text_key: 'node_34_pl' },
];

const eventJson = {
  id: eventId,
  projectId: 'custom',
  projectTitle: '직접 생성',
  chapterId: 1,
  titleKey: eventId,
  title: '새 게임 인트로 (방송국 인수)',
  startNode: 'graphic_01',
  nodes,
  localization: {
    ko: dialoguesKo,
    en: dialoguesEn,
    ja: dialoguesJa,
    'zh-cn': dialoguesZh,
    ru: dialoguesRu,
    es: dialoguesEs,
    de: dialoguesDe,
  },
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
  title: '새 게임 인트로 (방송국 인수)',
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

// 7. common_event_links.json 업데이트
const commonLinksPath = path.join(projectRoot, 'public', 'chapter_assets', 'common_event_links.json');
let commonLinks = {};
if (fs.existsSync(commonLinksPath)) {
  commonLinks = JSON.parse(fs.readFileSync(commonLinksPath, 'utf-8'));
}
commonLinks.intro = eventId;
fs.writeFileSync(commonLinksPath, JSON.stringify(commonLinks, null, 2), 'utf-8');
console.log('Updated common_event_links.json with intro slot.');
