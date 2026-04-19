import {Button, cn} from '@vector/ui'
import {useTranslation} from 'react-i18next'
import {LuShapes} from 'react-icons/lu'
import {ASSET_LIBRARY_CARDS, SIDEBAR_GLYPH_SIZE} from './LeftSidebarShared.tsx'

interface LeftSidebarAssetsTabProps {
  activeAssetId: string
  assetCount: number
  hoveredAssetId: string | null
  onHoverAsset: (assetId: string | null) => void
  onSelectAsset: (assetId: string) => void
  onOpenTemplatePicker: VoidFunction
}

export function LeftSidebarAssetsTab(props: LeftSidebarAssetsTabProps) {
  const {t} = useTranslation()
  const activeAsset = ASSET_LIBRARY_CARDS.find((item) => item.id === props.activeAssetId) ?? ASSET_LIBRARY_CARDS[0]

  return <section id={'variant-b-tabpanel-assets'} role={'tabpanel'} className={'flex min-h-0 flex-1 flex-col p-2.5'}>
    <h3 className={'mb-2 inline-flex items-center gap-2 font-semibold text-sm'}>
      <LuShapes size={SIDEBAR_GLYPH_SIZE}/>
      {t('shell.variantB.assets.title', 'Assets')}
    </h3>

    <div className={'relative grid min-h-0 flex-1 grid-cols-[1.1fr_0.9fr] gap-2'}>
      {props.hoveredAssetId &&
        <div className={'pointer-events-none absolute left-2 right-2 top-1 z-40 rounded-md bg-white/95 px-2 py-1 backdrop-blur dark:bg-slate-900/95'}>
          <div className={'text-[10px] font-semibold'}>
            {t('shell.variantB.assets.hoverHint', 'Tip: Double-click a card to open the template picker quickly.')}
          </div>
        </div>}
      <div className={'scrollbar-custom min-h-0 overflow-y-auto pr-0.5'}>
        <div className={'grid grid-cols-1 gap-2'}>
          {ASSET_LIBRARY_CARDS.map((card) => {
            const active = card.id === activeAsset.id
            const hovered = card.id === props.hoveredAssetId
            return (
              <article
                key={card.id}
                role={'button'}
                tabIndex={0}
                data-state={active ? 'active' : 'inactive'}
                className={cn(
                  'group rounded-md bg-white p-2 transition-all dark:bg-slate-900',
                  active
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50'
                    : 'hover:-translate-y-[1px]',
                  hovered && 'ring-1 ring-slate-300/80',
                )}
                onMouseEnter={() => {
                  props.onSelectAsset(card.id)
                  props.onHoverAsset(card.id)
                }}
                onMouseLeave={() => {
                  props.onHoverAsset(props.hoveredAssetId === card.id ? null : props.hoveredAssetId)
                }}
                onFocus={() => {
                  props.onSelectAsset(card.id)
                  props.onHoverAsset(card.id)
                }}
                onBlur={() => {
                  props.onHoverAsset(props.hoveredAssetId === card.id ? null : props.hoveredAssetId)
                }}
                onDoubleClick={props.onOpenTemplatePicker}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    props.onSelectAsset(card.id)
                    props.onOpenTemplatePicker()
                  }
                }}
              >
                <div className={'mb-1.5 rounded bg-slate-50 p-1.5 dark:bg-slate-950'}>
                  <div className={'h-12 w-full rounded bg-white dark:bg-slate-900'}/>
                </div>

                <div className={'text-xs font-medium'}>{card.title}</div>
                <div className={'text-[10px] text-slate-500 dark:text-slate-400'}>{card.subtitle}</div>

                {(active || hovered) &&
                  <div className={'mt-1.5 flex items-center justify-between gap-1'}>
                    <p className={'line-clamp-2 text-[10px] text-slate-500 dark:text-slate-400'}>{card.description}</p>
                    <div className={'flex items-center gap-1'}>
                      <Button
                        type={'button'}
                        variant={'ghost'}
                        size={'sm'}
                        noTooltip
                        title={t('ui.shell.variantB.assets.useTemplate', {defaultValue: 'Use template'})}
                        className={'h-6 shrink-0 px-1.5 text-[10px] font-semibold'}
                        onClick={props.onOpenTemplatePicker}
                      >
                        {t('ui.shell.variantB.assets.useTemplate', {defaultValue: 'Template'})}
                      </Button>
                      <Button
                        type={'button'}
                        variant={'ghost'}
                        size={'sm'}
                        noTooltip
                        title={t('ui.shell.variantB.assets.useTemplate', {defaultValue: 'Use template'})}
                        className={'h-6 shrink-0 px-1.5 text-[10px] font-semibold'}
                        onClick={props.onOpenTemplatePicker}
                      >
                        +
                      </Button>
                    </div>
                  </div>}
              </article>
            )
          })}
        </div>
      </div>

      <aside className={'flex min-h-0 flex-col rounded bg-white p-2 dark:bg-slate-900'}>
        <p className={'text-[11px] font-semibold'}>{t('shell.variantB.assets.details', 'Details')}</p>
        <p className={'text-[10px] text-slate-500 dark:text-slate-400'}>{activeAsset.subtitle}</p>

        <div className={'mt-2 rounded bg-slate-50 p-1.5 dark:bg-slate-950'}>
          <div className={'h-20 w-full rounded bg-white dark:bg-slate-900'}/>
        </div>

        <h4 className={'mt-2 text-xs font-semibold'}>{activeAsset.title}</h4>
        <p className={'mt-1 text-[11px] text-slate-500 dark:text-slate-400'}>{activeAsset.description}</p>

        <div className={'mt-auto pt-2'}>
          <div className={'mb-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400'}>
            <span>{t('shell.variantB.assets.total', 'Total Assets')}</span>
            <span className={'font-semibold text-inherit'}>{props.assetCount}</span>
          </div>
          <Button
            type={'button'}
            variant={'outline'}
            title={t('ui.shell.variantB.assets.useTemplate', {defaultValue: 'Open template picker'})}
            className={'mb-1 h-7 w-full justify-center text-xs font-semibold'}
            onClick={props.onOpenTemplatePicker}
          >
            {t('ui.shell.variantB.assets.useTemplate', {defaultValue: 'Use template'})}
          </Button>
          <Button
            type={'button'}
            variant={'outline'}
            title={t('ui.shell.variantB.assets.templateTooltip', {defaultValue: 'Create file from template preset'})}
            className={'h-7 w-full justify-center text-xs font-semibold'}
            onClick={props.onOpenTemplatePicker}
          >
            {t('ui.template.applyButtonLabel', {defaultValue: 'Add'})}
          </Button>
        </div>
      </aside>
    </div>
  </section>
}