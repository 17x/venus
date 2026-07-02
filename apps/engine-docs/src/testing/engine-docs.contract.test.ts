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
const venusSource = readFileSync(resolve(import.meta.dirname, '../../../../packages/engine/src/runtime/venus/Venus.ts'), 'utf8')
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

function getCreateSnippetCaseSource(type: string): string {
  const start = appSource.indexOf(`case '${type}':`)
  assert.notEqual(start, -1, `missing minimal create snippet for ${type}`)
  const nextCase = appSource.indexOf('\n    case ', start + 1)
  const nextDefault = appSource.indexOf('\n    default:', start + 1)
  const ends = [nextCase, nextDefault].filter((index) => index !== -1)
  const end = ends.length > 0 ? Math.min(...ends) : appSource.length
  return appSource.slice(start, end)
}

function getSourceBetween(startToken: string, endToken: string): string {
  const start = appSource.indexOf(startToken)
  assert.notEqual(start, -1, `missing source token ${startToken}`)
  const end = appSource.indexOf(endToken, start + startToken.length)
  assert.notEqual(end, -1, `missing source token ${endToken}`)
  return appSource.slice(start, end)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getVenusMethodJSDoc(methodName: string): string {
  const classStart = venusSource.indexOf('export class Venus')
  assert.notEqual(classStart, -1, 'missing Venus class declaration')
  const classSource = venusSource.slice(classStart)
  const pattern = methodName === 'constructor'
    ? /\n\s*constructor\(/
    : new RegExp(`\\n\\s*(?:async\\s+)?${escapeRegExp(methodName)}(?:<[^\\n]*>)?\\(`)
  const match = classSource.match(pattern)
  assert.ok(match?.index !== undefined, `missing Venus.${methodName} implementation`)

  const methodIndex = classStart + match.index
  const docEnd = venusSource.lastIndexOf('*/', methodIndex)
  const docStart = venusSource.lastIndexOf('/**', docEnd)
  assert.notEqual(docStart, -1, `missing JSDoc block for Venus.${methodName}`)
  assert.notEqual(docEnd, -1, `missing JSDoc block for Venus.${methodName}`)
  assert.match(venusSource.slice(docEnd + 2, methodIndex), /^\s*$/, `JSDoc must directly precede Venus.${methodName}`)
  return venusSource.slice(docStart, docEnd + 2)
}

function assertJSDocParam(doc: string, parameterName: string, methodName: string): void {
  assert.match(
    doc,
    new RegExp(`@param\\s+${escapeRegExp(parameterName)}(?:\\s|$)`),
    `Venus.${methodName} JSDoc must document @param ${parameterName}`,
  )
}

const venusMethodReferencePrefix = 'venus.'

describe('engine docs app contract', () => {
  it('defines categorized API pages with demos', () => {
    assert.deepEqual(
      engineApiCategories.map((category) => category.id),
      ['start', 'models', 'modules', 'methods', 'venus-parameters', 'backend-strategy', 'events', 'debug', 'qa'],
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

  it('keeps Venus Parameters independent and groups all methods by module', () => {
    const venusParametersCategory = engineApiCategories.find((category) => category.id === 'venus-parameters')
    assert.ok(venusParametersCategory)
    assert.deepEqual(venusParametersCategory.apis.map((api) => api.id), ['constructor-parameters'])

    const methodsCategory = engineApiCategories.find((category) => category.id === 'methods')
    assert.ok(methodsCategory)
    assert.deepEqual(methodsCategory.apis.map((api) => api.id), [...VENUS_PUBLIC_METHOD_NAMES])
    assert.ok(methodsCategory.apis.every((api) => api.moduleName), 'every method API must declare its owning module')
    assert.deepEqual(
      new Set(methodsCategory.apis.map((api) => api.moduleName)),
      new Set(['render', 'camera', 'hitTest', 'interaction', 'animate', 'debug', 'effects', 'history', 'export']),
    )

    const apiIds = new Set(engineApiCategories.flatMap((category) => category.apis.map((api) => api.id)))
    for (const removedId of ['venus-instance', 'instance-methods', 'object-model', 'document-add', 'venus-add', 'document-index']) {
      assert.equal(apiIds.has(removedId), false)
    }
  })

  it('documents every public Venus document model kind', () => {
    const documentModelsCategory = getCategory('models')
    const documentedKinds = documentModelsCategory.apis
      .filter((api) => api.id !== 'common-props')
      .map((api) => api.id)

    assert.deepEqual(documentedKinds, [...VENUS_DOCUMENT_MODEL_TYPES])

    for (const api of documentModelsCategory.apis) {
      if (api.id === 'common-props') continue
      const kind = api.id
      assert.ok(api.properties?.some((property) => property === `type: ${kind}`), `missing type property for ${kind}`)
      assert.ok(api.properties?.some((property) => property.startsWith('appearance?: VenusAppearance')), `missing structured appearance property for ${kind}`)
      assert.ok(api.properties?.some((property) => property.startsWith('constraints?:')), `missing constraints property for ${kind}`)
      assert.ok(api.properties?.some((property) => property.startsWith('exportSettings?:')), `missing exportSettings property for ${kind}`)
      assert.ok(api.properties?.some((property) => property.startsWith('data?:')), `missing data metadata property for ${kind}`)
      assert.ok(api.propertyGroups?.some((group) => group.title === 'Identity'), `missing Identity property group for ${kind}`)
      if (kind === 'group') {
        assert.equal(api.propertyGroups?.some((group) => group.title === 'Transform'), false, 'group must stay structure-only without a Transform property group')
      } else {
        assert.ok(api.propertyGroups?.some((group) => group.title === 'Transform'), `missing Transform property group for ${kind}`)
      }
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

  it('keeps method pages aligned with source JSDoc sections', () => {
    const methodsCategory = getCategory('methods')

    for (const api of methodsCategory.apis) {
      const doc = getVenusMethodJSDoc(api.id)
      assert.match(doc, new RegExp(`@name\\s+Venus\\.${escapeRegExp(api.id)}(?:\\s|$)`), `Venus.${api.id} JSDoc must declare @name`)
      assert.match(doc, /@description\s+\S/, `Venus.${api.id} JSDoc must declare @description`)
      assert.match(doc, /@example\s+Usage/, `Venus.${api.id} JSDoc must declare a Usage example`)

      for (const parameter of api.parameters ?? []) {
        assertJSDocParam(doc, parameter.name, api.id)
      }
    }

    const constructorDoc = getVenusMethodJSDoc('constructor')
    assert.match(constructorDoc, /@name\s+Venus\.constructor/)
    assert.match(constructorDoc, /@description\s+\S/)
    assert.match(constructorDoc, /@example\s+Usage/)
    assert.match(constructorDoc, /@param\s+parameters/)
  })

  it('keeps every document model backed by an editable Venus canvas demo', () => {
    const modelApiIds = getCategory('models').apis
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
    const hitApi = getCategory('modules').apis.find((api) => api.id === 'hit-test')

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
    assert.match(appSource, /max-h-\[min\(60vh,32rem\)\]/)
    assert.match(appSource, /Copy/)
    assert.match(appSource, /createUsageCode\(api, theme\)/)
    assert.match(appSource, /engineApiModuleGroups/)
    assert.match(appSource, /methods-\$\{group\.id\}/)
    assert.match(appSource, /api\.moduleName === group\.id/)
    assert.match(appSource, /<InteractiveMethodDemo api=\{api\} theme=\{theme\}\/>/)
    assert.match(appSource, /createDocsModulesForApi/)
    assert.match(appSource, /EventInspectorDemo/)
    assert.match(appSource, /ModelControlPanel/)
    assert.match(appSource, /logicalWidth = 400/)
    assert.match(appSource, /logicalHeight = 300/)
    assert.match(appSource, /h-\[300px\] w-\[400px\]/)
    assert.match(appSource, /lg:grid-cols-\[400px_minmax\(0,420px\)\]/)
    assert.doesNotMatch(appSource, /HeadingAnchor/)
    assert.doesNotMatch(appSource, /Copy heading link/)
    assert.doesNotMatch(appSource, /group-hover:opacity-100/)
    assert.doesNotMatch(appSource, /engine-docs-overview/)
    assert.doesNotMatch(appSource, /label: 'Shape model contract'/)
    assert.match(appSource, /label: 'Shapes'/)
    assert.match(appSource, /label: 'Common Properties'/)
    assert.match(appSource, /editableModelApiIds/)
    assert.match(appSource, /size-5.*items-center.*justify-center.*rounded.*border/)
    assert.match(appSource, /size-6.*cursor-pointer.*rounded.*border/)
    assert.match(appSource, /bg-muted\/25/)
    assert.match(appSource, /type=\{'number'\}/)
    assert.match(appSource, /type=\{'color'\}/)
    assert.match(appSource, /rotation/)
    assert.doesNotMatch(appSource, /originX/)
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
    assert.doesNotMatch(appSource, /childRectOriginX/)
    assert.match(appSource, /childTextX/)
    assert.match(appSource, /childTextWidth/)
    assert.match(appSource, /childTextOpacity/)
    assert.match(appSource, /childTextFontSize/)
    assert.match(appSource, /childTextLineHeight/)
    assert.match(appSource, /childTextRotation/)
    assert.doesNotMatch(appSource, /childTextOriginX/)
    assert.match(appSource, /childEllipseX/)
    assert.match(appSource, /childEllipseOpacity/)
    assert.match(appSource, /childEllipseStartAngle/)
    assert.match(appSource, /childEllipseRotation/)
    assert.doesNotMatch(appSource, /childEllipseOriginX/)
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
    assert.doesNotMatch(appSource, /<details/)
    assert.match(appSource, /data-theme=\{theme\}/)
    assert.match(appSource, /useState<ThemeMode>\('light'\)/)
    assert.match(appSource, /new Venus/)
    assert.match(appSource, /render: \{backend: 'canvas2d'\}/)
    assert.match(appSource, /AllShapesPlayground/)
    assert.match(appSource, /ShapeStoryDemo/)
    assert.doesNotMatch(appSource, /ShapePropertiesDemo/)
    assert.match(appSource, /CommonPropertiesDemo/)
    assert.match(appSource, /CollapsibleNav/)
    assert.match(appSource, /models-all-shapes-nav/)
    assert.doesNotMatch(appSource, /models-contract-nav/)
    assert.doesNotMatch(appSource, /ShapeModelGuide/)
    assert.match(appSource, /BasePropertyTable/)
    assert.match(appSource, /CommonPropertyPage/)
    assert.match(appSource, /commonPropertyOrder/)
    assert.match(appSource, /models-common-properties-\$\{field\}/)
    assert.doesNotMatch(appSource, /models-shape-properties-transform/)
    assert.doesNotMatch(appSource, /models-shape-properties-appearance/)
    assert.doesNotMatch(appSource, /models-shape-properties-effects/)
    assert.doesNotMatch(appSource, /models-shape-properties-specific/)
    assert.doesNotMatch(appSource, /CommonPropertiesPanel/)
    assert.doesNotMatch(appSource, /Current type/)
    assert.match(appSource, /Common Properties/)
    assert.match(appSource, /pathUseBezier/)
    assert.match(appSource, /bezierPoints/)
    assert.match(appSource, /ellipseDrawWedgeLine/)
    assert.match(appSource, /toggleField\('ellipseDrawWedgeLine'/)
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
    assert.match(docsSource, /title: 'Modules'/)
    assert.match(docsSource, /title: 'Base entry'/)
    assert.match(docsSource, /title: 'Module services'/)
    assert.match(docsSource, /@venus\/engine\/base/)
    assert.match(docsSource, /defineVenusModule/)
    assert.match(docsSource, /VENUS_MODULE_NAMES/)
    assert.match(docsSource, /VENUS_MODULE_CATALOG/)
    assert.match(docsSource, /core-module files: render, camera, hitTest, interaction, animate, debug, effects, history, export/)
    assert.match(docsSource, /core-facade modules: none/)
    assert.match(docsSource, /reserved modules: none/)
    assert.match(docsSource, /falls back to Canvas2D/)
    assert.match(docsSource, /registered services: document, viewport, invalidation, spatial, geometryCache, scheduler/)
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
    assert.match(docsSource, /render\|camera\|hitTest\|interaction\|animate\|debug\|effects\|history\|export/)
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
    assert.match(appSource, /api\.readableDescription/)
    assert.doesNotMatch(appSource, />Description</)
    assert.doesNotMatch(appSource, />Usage</)
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
    const fullDescriptionIndex = appSource.indexOf('<ApiDescription api={api}/>', descriptionIndex)
    const demoIndex = appSource.indexOf('<ApiCanvasDemo api={api} theme={theme}/>')
    const usageIndex = appSource.indexOf('<ApiUsage code=', demoIndex)
    const parametersIndex = appSource.indexOf('>Parameters</h4>')

    assert.ok(titleIndex >= 0)
    assert.ok(descriptionIndex > titleIndex)
    assert.ok(fullDescriptionIndex > descriptionIndex)
    assert.ok(demoIndex > fullDescriptionIndex)
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
    const documentModelsCategory = getCategory('models')

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

  it('removes the shape model contract wrapper while keeping model metadata available', () => {
    assert.deepEqual(
      VENUS_SHAPE_MODEL_SPECS.map((spec) => spec.type),
      [...VENUS_DOCUMENT_MODEL_TYPES],
    )
    assert.doesNotMatch(appSource, /Shape model contract/)
    assert.match(appSource, /BasePropertyTable/)
    assert.match(appSource, /basePropertyRowsByShape/)
    assert.match(appSource, /CommonPropertyPage/)
    assert.doesNotMatch(appSource, /models-common-properties-rect/)
  })

  it('generates per-shape create codeboxes from minimal model fields', () => {
    assert.match(appSource, /createShapeMinimalCreateCode/)
    assert.doesNotMatch(appSource, /type: '\$\{kind\}', x: 60, y: 50, width: 220, height: 140/)
    assert.doesNotMatch(appSource, /r\.x = 80\nr\.opacity = 0\.9/)

    const rect = getCreateSnippetCaseSource('rect')
    assert.match(rect, /type: 'rect'/)
    assert.match(rect, /width: 220/)
    assert.match(rect, /height: 140/)
    assert.doesNotMatch(rect, /\n  x:/)
    assert.doesNotMatch(rect, /\n  y:/)

    const ellipse = getCreateSnippetCaseSource('ellipse')
    assert.match(ellipse, /type: 'ellipse'/)
    assert.match(ellipse, /ellipseGeometry: \{ cx: 150, cy: 100, rx: 80, ry: 50 \}/)
    assert.doesNotMatch(ellipse, /\n  x:/)
    assert.doesNotMatch(ellipse, /\n  y:/)

    const line = getCreateSnippetCaseSource('line')
    assert.match(line, /type: 'line'/)
    assert.match(line, /width: 220/)
    assert.match(line, /height: 80/)
    assert.match(line, /points:/)
    assert.match(line, /\{x: 40, y: 80\}/)
    assert.match(line, /\{x: 260, y: 160\}/)
    assert.doesNotMatch(line, /\n  x:/)
    assert.doesNotMatch(line, /\n  y:/)

    const text = getCreateSnippetCaseSource('text')
    assert.match(text, /type: 'text'/)
    assert.match(text, /text: 'Hello Venus'/)
    assert.doesNotMatch(text, /\n  x:/)
    assert.doesNotMatch(text, /\n  y:/)
    assert.doesNotMatch(text, /\n  width:/)
    assert.doesNotMatch(text, /\n  height:/)

    const group = getCreateSnippetCaseSource('group')
    assert.match(group, /type: 'group'/)
    assert.match(group, /children: \[\]/)
    assert.doesNotMatch(group, /\n  width:/)
    assert.doesNotMatch(group, /\n  height:/)

    for (const type of ['clip', 'mask']) {
      const snippet = getCreateSnippetCaseSource(type)
      assert.match(snippet, new RegExp(`type: '${type}'`))
      assert.match(snippet, /clipPath:/)
      assert.match(snippet, /children:/)
      assert.doesNotMatch(snippet, /\n  x:/)
      assert.doesNotMatch(snippet, /\n  y:/)
      assert.doesNotMatch(snippet, /\n  width:/)
      assert.doesNotMatch(snippet, /\n  height:/)
    }

    const polygon = getCreateSnippetCaseSource('polygon')
    assert.match(polygon, /type: 'polygon'/)
    assert.match(polygon, /width: 220/)
    assert.match(polygon, /height: 140/)
    assert.match(polygon, /points:/)
    assert.doesNotMatch(polygon, /\n  x:/)
    assert.doesNotMatch(polygon, /\n  y:/)

    const path = getCreateSnippetCaseSource('path')
    assert.match(path, /type: 'path'/)
    assert.match(path, /anchorPoints:/)
    assert.match(path, /\{ x: 0, y: 140 \}/)
    assert.match(path, /\{ x: 110, y: 0, cp1: \{ x: 40, y: 100 \}, cp2: \{ x: 80, y: 20 \} \}/)
    assert.match(path, /\{ x: 220, y: 140 \}/)
    assert.doesNotMatch(path, /\n  x:/)
    assert.doesNotMatch(path, /\n  y:/)

    const image = getCreateSnippetCaseSource('image')
    assert.match(image, /type: 'image'/)
    assert.match(image, /width: 220/)
    assert.match(image, /height: 140/)
    assert.match(image, /assetId: 'my-image'/)
    assert.doesNotMatch(image, /\n  x:/)
    assert.doesNotMatch(image, /\n  y:/)
  })

  it('keeps visible shape model codeboxes minimal instead of echoing preview-only fields', () => {
    const minimalModelSource = getSourceBetween('const createMinimalModelNode =', 'const createBaseModelNode =')

    assert.match(minimalModelSource, /return \{type: 'rect', width: controls\.width, height: controls\.height\}/)
    assert.match(minimalModelSource, /return \{type: 'ellipse', width: controls\.width, height: controls\.height\}/)
    assert.match(minimalModelSource, /return \{type: 'line', width: controls\.x2 - controls\.x, height: controls\.y2 - controls\.y, points: \[\{x: controls\.x, y: controls\.y\}, \{x: controls\.x2, y: controls\.y2\}\]\}/)
    assert.match(minimalModelSource, /return \{type: 'text', text: controls\.text\}/)
    assert.match(minimalModelSource, /return \{type: 'group', children: \[/)
    assert.match(minimalModelSource, /clipPath: controls\.clipIsEllipse/)
    assert.match(minimalModelSource, /children: \[\{type: 'rect', width: controls\.childRectWidth, height: controls\.childRectHeight\}\]/)
    assert.match(minimalModelSource, /return \{type: 'polygon', width: controls\.width, height: controls\.height, points:/)
    assert.match(minimalModelSource, /return \{type: 'image', width: controls\.width, height: controls\.height, assetId: controls\.assetId\}/)

    assert.doesNotMatch(minimalModelSource, /type: 'text', x: controls\.x/)
    assert.doesNotMatch(minimalModelSource, /type: 'group', x: controls\.x/)
    assert.doesNotMatch(minimalModelSource, /type: apiId === 'clip-node' \? 'clip' : 'mask',\n\s+x:/)
    assert.doesNotMatch(minimalModelSource, /type: 'image', x: controls\.x/)
    assert.doesNotMatch(minimalModelSource, /imageSmoothing: controls\.imageSmoothing/)

    const baseModelSource = getSourceBetween('const createBaseModelNode =', 'const createModelCode =')
    assert.match(baseModelSource, /type: 'rect', x: controls\.x, y: controls\.y, width: controls\.width, height: controls\.height/)
    assert.match(baseModelSource, /type: 'ellipse', x: controls\.x, y: controls\.y, width: controls\.width, height: controls\.height/)
    assert.match(baseModelSource, /rotation: controls\.rotation/)
    assert.doesNotMatch(baseModelSource, /transform: \{rotation/)
    assert.match(appSource, /BasePropertyTable/)
    assert.match(appSource, /CommonPropertyStoryDemo/)
    assert.match(appSource, /CommonFieldControlPanel/)
  })
})
