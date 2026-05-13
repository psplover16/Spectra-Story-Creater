/**
 * 暫存 smoke test：模擬「實際使用」走一次吸血鬼短篇全流程。
 * 完成後可移除（屬於 discuss 階段的探查）。
 */
import { afterAll, describe, expect, it } from 'vitest'
import { mkdir, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { writeChapter, listChapters } from '@/services/files/chapterRepository'
import { writeCharacter } from '@/services/files/characterRepository'
import { writeFaction } from '@/services/files/factionRepository'
import { createNovel, readNovel, writeNovel } from '@/services/files/novelRepository'
import { exportChapter } from '@/services/export/htmlExporter'
import { exportsDir, novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-vampire-smoke-' + Date.now())

describe('smoke: 吸血鬼短篇全流程', () => {
  afterAll(async () => {
    // 保留產出供人工檢視；只清 tmp 內無關目錄
    // 這裡其實也順手清掉以免堆積
    await rm(ROOT, { recursive: true, force: true })
  })

  it('建小說 + 世界觀 + 陣營 + 兩位角色 + 兩章 + 匯出', async () => {
    await mkdir(ROOT, { recursive: true })

    // 1. 建立小說
    const novel = await createNovel(ROOT, { name: '夜霧之城', style: '哥德吸血鬼短篇' })
    const dir = novelDir(ROOT, '夜霧之城')
    expect(novel.id).toMatch(/[0-9a-f-]{36}/)

    // 2. 寫世界觀 + overall outline
    const meta = await readNovel(dir)
    await writeNovel(dir, {
      ...meta,
      worldview: [
        {
          id: 'wv-1',
          title: '世界背景',
          content:
            '十九世紀末東歐山城 Brașov，夜晚薄霧不散。吸血鬼以「黑紗會」之名於上流社會悄然活動，被教會「銀十字團」獵殺。',
        },
        {
          id: 'wv-2',
          title: '能量規則',
          content: '吸血鬼懼日光與聖銀，需於日出前回到陰冷處。被銀十字劍刃刺中心臟即真正死亡。',
        },
      ],
      overallOutline: {
        summary: '人類獵人 Maria 追查連環失蹤案，與黑紗會領主 Lucien 在城堡對峙。',
        chapters: [
          { chapterId: 'ch-1-marker', title: '失蹤的村姑', brief: 'Maria 接案，初探山城' },
          { chapterId: 'ch-2-marker', title: '霧夜對峙', brief: 'Maria 闖城堡，與 Lucien 對話' },
        ],
      },
    })

    // 3. 建陣營
    const blackSilk = await writeFaction(dir, {
      name: '黑紗會',
      alignment: 'antagonist',
      description: '夜間運作的吸血鬼貴族秘社',
      currentSituation: '近期需要新血脈，挑中山城村民下手',
    })
    const silverCross = await writeFaction(dir, {
      name: '銀十字團',
      alignment: 'protagonist',
      description: '教會直屬獵人組織',
      currentSituation: '人手不足，倚賴自由獵人接案',
    })

    // 4. 建角色
    const maria = await writeCharacter(dir, {
      name: 'Maria Voss',
      personality: '冷靜果斷，宿命感重',
      abilities: ['銀十字劍術', '夜視', '快馬'],
      appearance: '黑髮綁辮，紅色長外套，腰側佩短劍',
      socialStatus: '自由獵人，受銀十字團委託',
      factionId: silverCross.id,
      notes: '父母於十年前死於吸血鬼之手',
    })
    const lucien = await writeCharacter(dir, {
      name: 'Lucien Aldric',
      personality: '冷漠優雅，沉默寡言',
      abilities: ['霧化', '魅惑', '不死之軀'],
      appearance: '純白襯衫覆灰色長禮服，眼瞳泛淡紅',
      socialStatus: '黑紗會領主',
      factionId: blackSilk.id,
      relationships: [
        { targetCharacterId: maria.id, kind: '宿敵', description: '感應到 Maria 的血脈來歷' },
      ],
      notes: '已存活兩百年',
    })

    // 5. 寫兩個章節
    const ch1 = await writeChapter(dir, {
      index: 1,
      title: '失蹤的村姑',
      outline: 'Maria 抵達山城 Brașov，調查連環失蹤案，循線索找到黑紗會莊園入口。',
      scene: {
        location: '山城市集街頭',
        time: '黃昏',
        weather: '微霧',
        props: ['銀十字劍', '油燈', '失蹤者畫像'],
        mood: '壓抑、警戒',
      },
      content:
        'Maria 牽著栗色駿馬走進 Brașov 的石板市集。失蹤的第七人，是磨坊主的女兒。\n\n她遞出畫像，老婦人卻不肯抬眼。「夜裡別走山路。」這是她唯一肯說的話。',
      presentCharacters: [maria.id],
    })
    const ch2 = await writeChapter(dir, {
      index: 2,
      title: '霧夜對峙',
      outline: 'Maria 闖入黑紗會莊園，與 Lucien 對話交鋒，獲得後續線索但放走 Lucien。',
      scene: {
        location: '黑紗會莊園大廳',
        time: '深夜',
        weather: '濃霧',
        props: ['銀十字劍', '燭台', '畫像（已故領主夫人）'],
        mood: '緊繃、宿命感',
      },
      content:
        'Maria 推開鑄鐵雙扇門，月光從天窗灑下，映出大廳中央一席灰禮服男子。\n\n「你比預期更早。」Lucien 沒回頭。「但你不會今晚動手，因為你想要的，不是我的命。」',
      presentCharacters: [maria.id, lucien.id],
    })

    // 6. 匯出兩格式
    const allChapters = (await listChapters(dir)).map((c) => ({
      id: c.id,
      index: c.index,
      title: c.title,
      exported: true,
    }))

    const epub1 = await exportChapter({
      novelDir: dir,
      novelName: '夜霧之城',
      chapter: ch1,
      format: 'epub-like',
    })
    const web1 = await exportChapter({
      novelDir: dir,
      novelName: '夜霧之城',
      chapter: ch1,
      format: 'web-page',
      allChapters,
    })
    const epub2 = await exportChapter({
      novelDir: dir,
      novelName: '夜霧之城',
      chapter: ch2,
      format: 'epub-like',
    })
    const web2 = await exportChapter({
      novelDir: dir,
      novelName: '夜霧之城',
      chapter: ch2,
      format: 'web-page',
      allChapters,
    })

    expect(epub1.selfContained).toBe(true)
    expect(web1.selfContained).toBe(true)
    expect(epub2.selfContained).toBe(true)
    expect(web2.selfContained).toBe(true)

    const exportsList = await readdir(exportsDir(dir))
    expect(exportsList).toContain('chapter-1-失蹤的村姑-epub-like.html')
    expect(exportsList).toContain('chapter-1-失蹤的村姑-web-page.html')
    expect(exportsList).toContain('chapter-2-霧夜對峙-epub-like.html')
    expect(exportsList).toContain('chapter-2-霧夜對峙-web-page.html')

    // 7. 驗證匯出檔包含內文
    const epub1Html = await readFile(epub1.filePath, { encoding: 'utf-8' })
    expect(epub1Html).toContain('栗色駿馬')
    expect(epub1Html).toContain('磨坊主的女兒')

    const web2Html = await readFile(web2.filePath, { encoding: 'utf-8' })
    expect(web2Html).toContain('Lucien')
    expect(web2Html).toContain('chapter-1-失蹤的村姑-web-page.html') // 側欄連回 ch1

    // 印出來給人類看
    console.log('\n=== 吸血鬼短篇 smoke run ===')
    console.log('novel ID:', novel.id)
    console.log('characters:', [maria.id, lucien.id])
    console.log('factions:', [silverCross.id, blackSilk.id])
    console.log('chapters:', [ch1.id, ch2.id])
    console.log('exports dir:', exportsDir(dir))
  })
})
