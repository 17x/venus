import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, it} from 'node:test'
import {engineApiCategories} from '../engineApiDocs.ts'
import {
  Venus,
  VENUS_DOCUMENT_MODEL_TYPES,
  VENUS_PUBLIC_METHOD_NAMES,
  VENUS_SHAPE_MODEL_SPECS,
} from '../../../../packages/engine/src/index.ts'
import type {VenusHitTestOptions} from '../../../../packages/engine/src/index.ts'

const appSource = readFileSync(resolve(import.meta.dirname, '../App.tsx'), 'utf8')
const docsSource = readFileSync(resolve(import.meta.dirname, '../engineApiDocs.ts'), 'utf8')
const documentModelApiIdSuffix = '-node'
const documentedHitTestOptionNames: Array<keyof VenusHitTestOptions> = ['phase', 'tolerance', 'includeLocked']

/**
 * Returns one required API category or fails the current contract test.
 * @param id Category id to find.
 */
function getCategory(id: string) {
  const category = engineApiCategories.find((candidate) => candidate.id === id)
  assert.ok(category, `missing ${id} category`)
  return category
}

const venusMethodReferencePrefix = 'venus.'

describe('engine docs app contract', () => {
  it('defines categorized API pages with demos', () => {
    assert.deepEqual(
      engineApiCategories.map((category) => category.id),
      ['start', 'document-models', 'venus-parameters', 'backend-strategy', 'methods', 'base-modules', 'hittest', 'camera', 'performance', 'animation', 'events', 'debug', 'qa'],
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

  it('keeps Venus Parameters independent and lists all methods flat', () => {
    const venusParametersCategory = engineApiCategories.find((category) => category.id === 'venus-parameters')
    assert.ok(venusParametersCategory)
    assert.deepEqual(venusParametersCategory.apis.map((api) => api.id), ['constructor-parameters'])

    const methodsCategory = engineApiCategories.find((category) => category.id === 'methods')
    assert.ok(methodsCategory)
    assert.deepEqual(methodsCategory.apis.map((api) => api.id), [
      'add', 'bounds', 'children', 'getNodeById', 'getParentId', 'snapshot',
      'fitBounds', 'zoomTo', 'panBy', 'project', 'unproject',
      'enableDebug', 'inspect', 'measureFrame',
      'mount', 'resize', 'render', 'hitTest', 'on', 'off', 'modules', 'animate', 'destroy',
      'update', 'remove', 'group', 'ungroup', 'addChild', 'removeChild',
    ])

    const apiIds = new Set(engineApiCategories.flatMap((category) => category.apis.map((api) => api.id)))
    for (const removedId of ['venus-instance', 'instance-methods', 'object-model', 'document-add', 'venus-add', 'document-index']) {
      assert.equal(apiIds.has(removedId), false)
    }
  })

  it('documents every public Venus document model kind', () => {
    const documentModelsCategory = getCategory('document-models')
    const documentedKinds = documentModelsCategory.apis
      .filter((api) => api.id.endsWith(documentModelApiIdSuffix))
      .map((api) => {
        assert.ok(api.id.endsWith(documentModelApiIdSuffix), `document model api id must end with ${documentModelApiIdSuffix}`)
        return api.id.slice(0, -documentModelApiIdSuffix.length)
      })

    assert.deepEqual(documentedKinds, [...VENUS_DOCUMENT_MODEL_TYPES])

    for (const api of documentModelsCategory.apis) {
      if (!api.id.endsWith(documentModelApiIdSuffix)) continue
      const kind = api.id.slice(0, -documentModelApiIdSuffix.length)
      assert.ok(api.properties?.some((property) => property === `type: ${kind}`), `missing type property for ${kind}`)
      assert.ok(api.properties?.some((property) => property.startsWith('appearance?: VenusAppearance')), `missing structured appearance property for ${kind}`)
      assert.ok(api.properties?.some((property) => property.startsWith('constraints?:')), `missing constraints property for ${kind}`)
      assert.ok(api.properties?.some((property) => property.startsWith('exportSettings?:')), `missing exportSettings property for ${kind}`)
      assert.ok(api.properties?.some((property) => property.startsWith('data?:')), `missing data metadata property for ${kind}`)
      assert.ok(api.propertyGroups?.some((group) => group.title === 'Identity'), `missing Identity property group for ${kind}`)
      assert.ok(api.propertyGroups?.some((group) => group.title === 'Transform'), `missing Transform property group for ${kind}`)
      assert.ok(api.propertyGroups?.some((group) => group.title === 'Appearance'), `missing Appearance property group for ${kind}`)
      assert.match(api.demo, new RegExp(`type:\\s*['"]${kind}['"]|type:\\s*${kind}\\b`), `demo must add a ${kind} node`)
    }
  })

  it('documents only public Venus instance methods', () => {
    const methodsCategory = getCategory('methods')
    const documentedMethodNames = methodsCategory.apis.map((api) => api.id)
    const venusPrototype = Venus.prototype as unknown as Record<string, unknown>

    assert.deepEqual(documentedMethodNames, [...VENUS_PUBLIC_METHOD_NAMES])

    for (const methodName of VENUS_PUBLIC_METHOD_NAMES) {
      assert.equal(typeof venusPrototype[methodName], 'function', `${methodName} must exist on Venus.prototype`)
    }

    const nestedMethodNames = engineApiCategories
      .flatMap((category) => category.apis)
      .flatMap((api) => api.methods ?? [])
      .map((method) => method.name)
      .filter((name) => name.startsWith(venusMethodReferencePrefix))
      .map((name) => name.slice(venusMethodReferencePrefix.length))

    for (const methodName of nestedMethodNames) {
      assert.ok(
        (VENUS_PUBLIC_METHOD_NAMES as readonly string[]).includes(methodName),
        `${methodName} must be declared as a public Venus method before docs can reference it`,
      )
    }
  })

  it('keeps every document model backed by an editable Venus canvas demo', () => {
    const modelApiIds = getCategory('document-models').apis
      .filter((api) => api.id !== 'common-props')
      .map((api) => api.id)
    const editableSetMatch = appSource.match(/editableModelApiIds = new Set\(\[([^\]]+)\]\)/)

    assert.ok(editableSetMatch, 'editableModelApiIds set must be declared')

    const editableModelApiIds = Array.from(editableSetMatch[1].matchAll(/'([^']+)'/g)).map((match) => match[1])
    assert.deepEqual(editableModelApiIds, modelApiIds)

    for (const apiId of modelApiIds) {
      assert.match(appSource, new RegExp(`apiId === '${apiId}'`), `${apiId} must have editable node creation logic`)
    }

    assert.match(appSource, /type: 'polygon'/)
    assert.match(appSource, /type: 'path'/)
    assert.match(appSource, /type: 'image'/)
    assert.match(appSource, /pathClosed/)
    assert.match(appSource, /fill: controls\.pathClosed \? fill : 'transparent'/)
    assert.match(appSource, /imageSmoothing/)
    assert.match(appSource, /assetId/)
  })

  it('only adds parameter, property, and method sections when they fit the API', () => {
    const apis = new Map(engineApiCategories.flatMap((category) => category.apis.map((api) => [api.id, api])))

    assert.ok(apis.get('constructor-parameters')?.parameters?.length)
    assert.equal(apis.get('constructor-parameters')?.properties, undefined)
    assert.equal(apis.get('constructor-parameters')?.methods, undefined)

    assert.ok(apis.get('add')?.parameters?.length)
    assert.ok(apis.get('getNodeById')?.parameters?.length)
    assert.ok(apis.get('event-system')?.methods?.every((method) => (method.parameters?.length ?? 0) > 0))

    assert.equal(apis.get('events-demo')?.parameters, undefined)
    assert.equal(apis.get('events-demo')?.properties, undefined)
    assert.equal(apis.get('events-demo')?.methods, undefined)
    assert.equal(apis.get('revision')?.parameters, undefined)
    assert.equal(apis.get('revision')?.properties, undefined)
    assert.equal(apis.get('revision')?.methods, undefined)

    assert.ok(apis.get('hit-test')?.parameters?.length)
    assert.ok(apis.get('camera-controls')?.methods?.every((method) => method.name.startsWith('venus.')))
  })

  it('keeps documented APIs aligned with current implementation', () => {
    const hitApi = getCategory('hittest').apis.find((api) => api.id === 'hit-test')

    assert.ok(hitApi)
    assert.deepEqual(hitApi.parameters?.map((parameter) => parameter.name), ['point', 'options.phase', 'options.tolerance', 'options.includeLocked'])
    assert.deepEqual(
      hitApi.parameters?.slice(1).map((parameter) => parameter.name.replace('options.', '')),
      documentedHitTestOptionNames,
    )
    assert.match(hitApi.demo, /phase: 'hover'/)
    assert.match(hitApi.demo, /phase: 'click'/)
    assert.doesNotMatch(hitApi.demo, /clipBehavior/)
    assert.doesNotMatch(docsSource, /under development|app-side timer hack/)
    assert.doesNotMatch(docsSource, /\bshould\b/)
  })

  it('uses canvas demos and editable model controls', () => {
    assert.match(appSource, /Engine API navigation/)
    assert.match(appSource, /lg:grid-cols-\[300px_minmax\(0,1fr\)\]/)
    assert.match(appSource, /<table/)
    assert.match(appSource, />Default</)
    assert.match(appSource, /Properties/)
    assert.match(appSource, /api\.propertyGroups/)
    assert.match(appSource, /group\.title/)
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
    assert.match(appSource, /lg:grid-cols-\[400px_480px\]/)
    assert.match(appSource, /HeadingAnchor/)
    assert.match(appSource, /group-hover:opacity-100/)
    assert.match(appSource, /group-focus-within:opacity-100/)
    assert.match(appSource, /editableModelApiIds/)
    assert.match(appSource, /size-5.*items-center.*justify-center.*rounded.*border/)
    assert.match(appSource, /size-6.*cursor-pointer.*rounded.*border/)
    assert.match(appSource, /bg-muted\/25/)
    assert.match(appSource, /type=\{'number'\}/)
    assert.match(appSource, /type=\{'color'\}/)
    assert.match(appSource, /rotation/)
    assert.match(appSource, /originX/)
    assert.match(appSource, /clipIsEllipse/)
    assert.match(appSource, /fill opacity/)
    assert.match(appSource, /stroke opacity/)
    assert.match(appSource, />Transform</)
    assert.match(appSource, />Appearance</)
    assert.match(appSource, />Effects</)
    assert.match(appSource, />Typography</)
    assert.match(appSource, /compositeTarget/)
    assert.match(appSource, /childRectX/)
    assert.match(appSource, /childRectOpacity/)
    assert.match(appSource, /childRectCornerRadius/)
    assert.match(appSource, /childRectRotation/)
    assert.match(appSource, /childRectOriginX/)
    assert.match(appSource, /childTextX/)
    assert.match(appSource, /childTextWidth/)
    assert.match(appSource, /childTextOpacity/)
    assert.match(appSource, /childTextFontSize/)
    assert.match(appSource, /childTextLineHeight/)
    assert.match(appSource, /childTextRotation/)
    assert.match(appSource, /childTextOriginX/)
    assert.match(appSource, /childEllipseX/)
    assert.match(appSource, /childEllipseOpacity/)
    assert.match(appSource, /childEllipseStartAngle/)
    assert.match(appSource, /childEllipseRotation/)
    assert.match(appSource, /childEllipseOriginX/)
    assert.match(appSource, /clipPathX/)
    assert.match(appSource, /controls\.compositeTarget !== 'parent'/)
    assert.match(appSource, /cornerTopLeft/)
    assert.match(appSource, /cornerTopRight/)
    assert.match(appSource, /cornerBottomRight/)
    assert.match(appSource, /cornerBottomLeft/)
    assert.match(appSource, /ellipseStartAngle/)
    assert.match(appSource, />Text</)
    assert.match(appSource, /lineHeight/)
    assert.match(docsSource, /rotation\?: number/)
    assert.match(docsSource, /nested scene tree objects/)
    assert.match(docsSource, /venus\.getNodeById/)
    assert.match(docsSource, /strokeWidth\?: number, 0 means no stroke/)
    assert.match(docsSource, /minimal: type \+ width \+ height/)
    assert.match(docsSource, /editor bounds/)
    assert.match(docsSource, /container node/)
    assert.match(appSource, /setControls/)
    assert.match(appSource, /<Plus/)
    assert.match(appSource, /Hit test/)
    assert.match(appSource, /hoverHit/)
    assert.match(appSource, /clickedHit/)
    assert.match(appSource, /onMouseMove=\{handleCanvasHover\}/)
    assert.match(appSource, /phase: 'hover'/)
    assert.match(appSource, /phase: 'click'/)
    assert.match(appSource, />Hover</)
    assert.match(appSource, />Clicked</)
    assert.match(appSource, /<details/)
    assert.match(appSource, /data-theme=\{theme\}/)
    assert.match(appSource, /useState<ThemeMode>\('light'\)/)
    assert.match(appSource, /new Venus/)
    assert.match(appSource, /render: \{backend: 'canvas2d'\}/)
    assert.match(appSource, /AllShapesDemo/)
    assert.match(appSource, /ShapeStoryDemo/)
    assert.match(appSource, /ShapePropertiesDemo/)
    assert.match(appSource, /CollapsibleNav/)
    assert.match(appSource, /document-models-all-shapes-nav/)
    assert.match(appSource, /document-models-shape-contract-nav/)
    assert.match(appSource, /ShapeModelGuide/)
    assert.match(appSource, /VENUS_SHAPE_MODEL_SPECS/)
    assert.match(appSource, /VENUS_COMMON_RENDER_PROPERTIES/)
    assert.match(appSource, /document-models-shape-properties-transform/)
    assert.match(appSource, /document-models-shape-properties-appearance/)
    assert.match(appSource, /document-models-shape-properties-effects/)
    assert.match(appSource, /document-models-shape-properties-specific/)
    assert.match(appSource, /CommonPropertiesPanel/)
    assert.match(appSource, /Current type/)
    assert.match(appSource, /Common properties/)
    assert.match(appSource, /pathUseBezier/)
    assert.match(appSource, /bezierPoints/)
    assert.match(appSource, /ellipseDrawWedgeLine/)
    assert.match(appSource, /Draw wedge line/)
    assert.match(docsSource, /ellipseDrawWedgeLine\?: boolean/)
    assert.match(appSource, /ThemeHoverMenu/)
    assert.match(appSource, /themeOptions/)
    assert.match(appSource, /engine-code-scroll/)
    assert.match(appSource, /useMemo/)
    assert.match(appSource, /const demoNodes = useMemo/)
    assert.match(appSource, /let cancelled = false/)
    assert.doesNotMatch(appSource, /const editableNodes =/)
    assert.doesNotMatch(appSource, /setBackendDiagnostics\(null\)/)
    assert.doesNotMatch(appSource, /void venus\.render\(\)\.then\(\(\) => setBackendDiagnostics/)
    assert.doesNotMatch(appSource, /backend: \{diagnostics\.backend\}/)
    assert.doesNotMatch(appSource, /fallback: none/)
    assert.match(appSource, /venus\.on\('backend:fallback'/)
    assert.match(appSource, /base-entry/)
    assert.match(appSource, /api\.id === 'base-entry'/)
    assert.match(appSource, /venus\.add/)
    assert.match(docsSource, /title: 'Base and Modules'/)
    assert.match(docsSource, /title: 'Module services'/)
    assert.match(docsSource, /@venus\/engine\/base/)
    assert.match(docsSource, /defineVenusModule/)
    assert.match(docsSource, /VENUS_MODULE_NAMES/)
    assert.match(docsSource, /falls back to Canvas2D/)
    assert.match(docsSource, /registered services: document, viewport, invalidation/)
    assert.match(docsSource, /VenusRegisteredServiceMap/)
    assert.match(docsSource, /venus\.inspect\(\)\.modules/)
    assert.match(docsSource, /module diagnostics/)
    assert.match(docsSource, /services\.get\("document"\): VenusDocumentService/)
    assert.match(docsSource, /services\.require\("viewport"\): VenusViewportService/)
    assert.match(docsSource, /Use get\(\) for optional services and require\(\)/)
    assert.match(docsSource, /module\.dependsOn\?: VenusModuleName\[\]/)
    assert.match(docsSource, /module\.requires\?: VenusInternalServiceName\[\]/)
    assert.match(docsSource, /Use dependsOn for user-module dependencies/)
    assert.match(docsSource, /requires on the module definition to fail before install runs/)
    assert.match(docsSource, /title: 'Backend Strategy'/)
    assert.match(docsSource, /WebGL is the primary presentation path/)
    assert.match(docsSource, /Canvas2D-to-texture: text, shadows, blur, masks/)
    assert.match(docsSource, /Animation invalidation/)
    assert.match(docsSource, /Animation never calls WebGL or Canvas2D directly/)
    assert.match(appSource, /apiId === 'render-backends'/)
    assert.match(appSource, /apiId === 'animation-invalidation'/)
    assert.match(docsSource, /stable shallow-frozen facades/)
    assert.match(docsSource, /backend fallback diagnostics/)
    assert.match(docsSource, /backend:fallback/)
    assert.match(docsSource, /render\|camera\|hitTest\|select\|snap\|animate\|debug\|scale\|effects\|history\|export/)
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

  // FM-P0-005: docs cannot regress to one flat string list only.
  it('groups every documented property into a non-empty taxonomy bucket', () => {
    for (const category of engineApiCategories) {
      for (const api of category.apis) {
        if (!api.properties || api.properties.length === 0) {
          continue
        }

        // Every API with properties must also define propertyGroups.
        assert.ok(api.propertyGroups, `${api.id} has properties but no propertyGroups`)
        assert.ok(api.propertyGroups.length > 0, `${api.id} has empty propertyGroups`)

        // Every property must appear in exactly one group.
        const propertyKeys = api.properties.map((property) => property.split(':')[0].split('?')[0])
        for (const key of propertyKeys) {
          const groups = api.propertyGroups.filter((group) =>
            group.properties.some((prop) => prop.split(':')[0].split('?')[0] === key),
          )
          assert.equal(
            groups.length,
            1,
            `${api.id} property "${key}" appears in ${groups.length} groups (expected exactly 1)`,
          )
        }

        // No group should be empty.
        for (const group of api.propertyGroups) {
          assert.ok(group.properties.length > 0, `${api.id} group "${group.title}" is empty`)
        }
      }
    }
  })

  // FM-P0-004: every document model must include structured identity and metadata fields.
  it('documents structured metadata fields on every document model kind', () => {
    const documentModelsCategory = getCategory('document-models')

    for (const api of documentModelsCategory.apis) {
      if (api.id === 'common-props') continue
      assert.ok(        api.properties?.some((property) => property.startsWith('data?:')),
        `${api.id} must document the data host metadata field`,
      )
      assert.ok(
        api.properties?.some((property) => property.startsWith('constraints?:')),
        `${api.id} must document the constraints field`,
      )
      assert.ok(
        api.properties?.some((property) => property.startsWith('exportSettings?:')),
        `${api.id} must document the exportSettings field`,
      )
    }
  })

  it('renders the engine shape model contract from shared specs', () => {
    assert.deepEqual(
      VENUS_SHAPE_MODEL_SPECS.map((spec) => spec.type),
      [...VENUS_DOCUMENT_MODEL_TYPES],
    )
    assert.match(appSource, /Shape model contract/)
    assert.match(appSource, /spec\.minimalCreate\.join/)
    assert.match(appSource, /spec\.pathExpansion/)
    assert.match(appSource, /spec\.commonRender\.join/)
    assert.match(appSource, /r\.update\(\{appearance: \{\.\.\.\}\}\)/)
  })
})
