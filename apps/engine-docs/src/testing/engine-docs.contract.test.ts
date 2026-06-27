import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, it} from 'node:test'
import {engineApiCategories} from '../engineApiDocs.ts'

const appSource = readFileSync(resolve(import.meta.dirname, '../App.tsx'), 'utf8')
const docsSource = readFileSync(resolve(import.meta.dirname, '../engineApiDocs.ts'), 'utf8')

describe('engine docs app contract', () => {
  it('defines categorized API pages with demos', () => {
    assert.deepEqual(
      engineApiCategories.map((category) => category.id),
      ['start', 'document-models', 'venus-parameters', 'methods', 'hittest', 'camera', 'performance', 'animation', 'events', 'debug', 'qa'],
    )

    for (const category of engineApiCategories) {
      assert.ok(category.title)
      assert.ok(category.apis.length > 0)

      for (const api of category.apis) {
        assert.ok(api.title)
        assert.ok(api.summary)
        assert.ok(api.readableDescription)
        assert.ok(api.demo.includes('@venus/engine') || api.demo.includes('Venus') || api.demo.includes('venus.'))
        assert.ok(api.demoCaption)
        assert.equal('signature' in api, false)
      }
    }
  })

  it('keeps Venus Parameters independent and moves venus.add into Methods', () => {
    const venusParametersCategory = engineApiCategories.find((category) => category.id === 'venus-parameters')
    assert.ok(venusParametersCategory)
    assert.deepEqual(venusParametersCategory.apis.map((api) => api.id), ['constructor-parameters'])

    const methodsCategory = engineApiCategories.find((category) => category.id === 'methods')
    assert.ok(methodsCategory)
    assert.deepEqual(methodsCategory.apis.map((api) => api.id), ['venus-add', 'document-index'])

    const apiIds = new Set(engineApiCategories.flatMap((category) => category.apis.map((api) => api.id)))
    for (const removedId of ['venus-instance', 'instance-methods', 'object-model', 'document-add']) {
      assert.equal(apiIds.has(removedId), false)
    }
  })

  it('documents every public Venus document model kind', () => {
    const apiIds = new Set(engineApiCategories.flatMap((category) => category.apis.map((api) => api.id)))

    for (const expectedId of ['rect-node', 'ellipse-node', 'line-node', 'text-node', 'group-node', 'clip-node', 'mask-node']) {
      assert.ok(apiIds.has(expectedId), `missing ${expectedId}`)
    }
  })

  it('only adds parameter, property, and method sections when they fit the API', () => {
    const apis = new Map(engineApiCategories.flatMap((category) => category.apis.map((api) => [api.id, api])))

    assert.ok(apis.get('constructor-parameters')?.parameters?.length)
    assert.equal(apis.get('constructor-parameters')?.properties, undefined)
    assert.equal(apis.get('constructor-parameters')?.methods, undefined)

    assert.ok(apis.get('venus-add')?.parameters?.length)
    assert.ok(apis.get('venus-add')?.methods?.length)
    assert.ok(apis.get('document-index')?.methods?.some((method) => method.name === 'venus.document.getNodeById'))
    assert.ok(apis.get('event-system')?.methods?.every((method) => (method.parameters?.length ?? 0) > 0))

    assert.equal(apis.get('events-demo')?.parameters, undefined)
    assert.equal(apis.get('events-demo')?.properties, undefined)
    assert.equal(apis.get('events-demo')?.methods, undefined)
    assert.equal(apis.get('revision')?.parameters, undefined)
    assert.equal(apis.get('revision')?.properties, undefined)
    assert.equal(apis.get('revision')?.methods, undefined)

    assert.ok(apis.get('hit-test')?.parameters?.length)
    assert.ok(apis.get('camera-controls')?.methods?.every((method) => method.name.startsWith('venus.camera.')))
  })

  it('uses canvas demos and editable model controls', () => {
    assert.match(appSource, /Engine API navigation/)
    assert.match(appSource, /lg:grid-cols-\[300px_minmax\(0,1fr\)\]/)
    assert.match(appSource, /<table/)
    assert.match(appSource, />Default</)
    assert.match(appSource, /Properties/)
    assert.match(appSource, /Methods/)
    assert.match(appSource, /\{api\.summary\}/)
    assert.match(appSource, /max-h-72/)
    assert.match(appSource, /Copy/)
    assert.match(appSource, /createUsageCode\(api, theme\)/)
    assert.match(appSource, /EventInspectorDemo/)
    assert.match(appSource, /ModelControlPanel/)
    assert.match(appSource, /logicalWidth = 400/)
    assert.match(appSource, /logicalHeight = 300/)
    assert.match(appSource, /h-\[300px\] w-\[400px\]/)
    assert.match(appSource, /lg:grid-cols-\[400px_420px\]/)
    assert.match(appSource, /HeadingAnchor/)
    assert.match(appSource, /group-hover:opacity-100/)
    assert.match(appSource, /group-focus-within:opacity-100/)
    assert.match(appSource, /editableModelApiIds/)
    assert.match(appSource, /grid-cols-\[48px_64px_24px\]/)
    assert.match(appSource, /h-7 w-16/)
    assert.match(appSource, /type=\{'number'\}/)
    assert.match(appSource, /type=\{'color'\}/)
    assert.match(appSource, /rotation/)
    assert.match(appSource, /scaleX/)
    assert.match(appSource, /originX/)
    assert.match(appSource, /skewX/)
    assert.match(appSource, /skewY/)
    assert.match(appSource, /flipX/)
    assert.match(appSource, /flipY/)
    assert.match(appSource, /clipIsEllipse/)
    assert.match(appSource, /fill α/)
    assert.match(appSource, /stroke α/)
    assert.match(appSource, />Transform</)
    assert.match(appSource, />Appearance</)
    assert.match(appSource, />Effects</)
    assert.match(appSource, />Typography</)
    assert.match(appSource, /compositeTarget/)
    assert.match(appSource, /childRectX/)
    assert.match(appSource, /childRectOpacity/)
    assert.match(appSource, /childRectCornerRadius/)
    assert.match(appSource, /childRectRotation/)
    assert.match(appSource, /childRectScaleX/)
    assert.match(appSource, /childRectOriginX/)
    assert.match(appSource, /childTextX/)
    assert.match(appSource, /childTextWidth/)
    assert.match(appSource, /childTextOpacity/)
    assert.match(appSource, /childTextFontSize/)
    assert.match(appSource, /childTextLineHeight/)
    assert.match(appSource, /childTextRotation/)
    assert.match(appSource, /childTextScaleX/)
    assert.match(appSource, /childTextOriginX/)
    assert.match(appSource, /childEllipseX/)
    assert.match(appSource, /childEllipseOpacity/)
    assert.match(appSource, /childEllipseStartAngle/)
    assert.match(appSource, /childEllipseRotation/)
    assert.match(appSource, /childEllipseScaleX/)
    assert.match(appSource, /childEllipseOriginX/)
    assert.match(appSource, /clipPathX/)
    assert.match(appSource, /controls\.compositeTarget !== 'parent'/)
    assert.match(appSource, /top left/)
    assert.match(appSource, /ellipseStartAngle/)
    assert.match(appSource, /multi-line text/)
    assert.match(appSource, /lineHeight/)
    assert.match(docsSource, /transform\?: Transform2D/)
    assert.match(docsSource, /scaleX/)
    assert.match(docsSource, /origin/)
    assert.match(docsSource, /nested scene tree objects/)
    assert.match(docsSource, /venus\.document\.getNodeById/)
    assert.match(docsSource, /strokeWidth\?: number, 0 means no stroke/)
    assert.match(docsSource, /same tree shape as clip/)
    assert.match(docsSource, /scene tree containers/)
    assert.match(appSource, /setControls/)
    assert.match(appSource, /Add node/)
    assert.match(appSource, /Hit test/)
    assert.match(appSource, /<details/)
    assert.match(appSource, /data-theme=\{theme\}/)
    assert.match(appSource, /useState<ThemeMode>\('light'\)/)
    assert.match(appSource, /new Venus/)
    assert.match(appSource, /venus\.add/)
    assert.match(docsSource, /title: 'Rect'/)
    assert.match(docsSource, /title: 'Mask'/)
    assert.doesNotMatch(docsSource, /title: '(Rect|Ellipse|Line|Text|Group|Clip|Mask) Node'/)
    assert.doesNotMatch(appSource, /createEngine/)
    assert.doesNotMatch(appSource, /On this page/)
    assert.doesNotMatch(appSource, />API guide</)
    assert.doesNotMatch(appSource, />Guide</)
    assert.doesNotMatch(appSource, /quickStartSnippet/)
    assert.doesNotMatch(appSource, /engineApiCategories\[0\]\.apis\[0\]/)
    assert.doesNotMatch(appSource, /topics</)
    assert.doesNotMatch(appSource, />Example</)
    assert.doesNotMatch(appSource, /gap-8 border-t py-10/)
    assert.doesNotMatch(appSource, /api\.demoCaption/)
    assert.doesNotMatch(appSource, /api\.readableDescription/)
    assert.doesNotMatch(appSource, /<figcaption/)
    assert.doesNotMatch(appSource, /Signature/)
    assert.doesNotMatch(appSource, /TabsTrigger/)
    assert.doesNotMatch(appSource, /Adjust properties/)
    assert.doesNotMatch(appSource, /Updates this Venus canvas immediately/)
    assert.doesNotMatch(appSource, /rounded-full bg-muted/)
    assert.doesNotMatch(appSource, /Group child/)
    assert.equal(appSource.includes("showText = apiId === 'text-node' || apiId === 'group-node'"), false)
    assert.doesNotMatch(docsSource, /signature:/)
  })

  it('orders each API page for reading before reference', () => {
    const titleIndex = appSource.indexOf('<h3')
    const descriptionIndex = appSource.indexOf('{api.summary}')
    const demoIndex = appSource.indexOf('<ApiCanvasDemo api={api} theme={theme}/>')
    const usageIndex = appSource.indexOf('<details')
    const parametersIndex = appSource.indexOf('>Parameters</h4>')

    assert.ok(titleIndex >= 0)
    assert.ok(descriptionIndex > titleIndex)
    assert.ok(demoIndex > descriptionIndex)
    assert.ok(usageIndex > demoIndex)
    assert.ok(parametersIndex > usageIndex)
  })
})
