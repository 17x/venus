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
  onApplyAsset: (assetId: string) => void
}

export function LeftSidebarAssetsTab(props: LeftSidebarAssetsTabProps) {
  const {t} = useTranslation()

  return <section id={'variant-b-tabpanel-assets'} role={'tabpanel'} className={'flex min-h-0 flex-1 flex-col p-2.5'}>
    <h3 className={'mb-2 inline-flex items-center gap-2 font-semibold text-sm'}>
      <LuShapes size={SIDEBAR_GLYPH_SIZE}/>
      {t('shell.variantB.assets.title', 'Assets')}
    </h3>

    <div className={'scrollbar-custom min-h-0 flex-1 overflow-y-auto pt-1.5'}>
      {/* <div className={'mb-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400'}>
        <span>{t('shell.variantB.assets.total', 'Total Assets')}</span>
        <span className={'font-semibold text-inherit'}>{props.assetCount}</span>
      </div> */}

      <div className={'grid grid-cols-2 gap-2'}>
        {ASSET_LIBRARY_CARDS.map((card) => {
          const active = card.id === props.activeAssetId
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
              onDoubleClick={() => {
                props.onApplyAsset(card.id)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  props.onSelectAsset(card.id)
                  props.onApplyAsset(card.id)
                }
              }}
            >
              <div className={'mb-1.5 rounded bg-slate-50 p-1.5 dark:bg-slate-950'}>
                <div className={'h-12 w-full rounded bg-white dark:bg-slate-900'}/>
              </div>

              <div className={'text-xs font-medium'}>{card.title}</div>
              <div className={'text-[10px] text-slate-500 dark:text-slate-400'}>{card.subtitle}</div>
              <p className={'mt-1 line-clamp-2 text-[10px] text-slate-500 dark:text-slate-400'}>{card.description}</p>

              <div className={'mt-2 h-6'}>
                <Button
                  type={'button'}
                  variant={'outline'}
                  size={'sm'}
                  noTooltip
                  title={t('ui.shell.variantB.assets.useTemplate', {defaultValue: 'Apply fake data preset'})}
                  className={cn(
                    'h-6 w-full justify-center px-1.5 text-[10px] font-semibold transition-opacity',
                    (active || hovered) ? 'opacity-100' : 'opacity-0 pointer-events-none',
                  )}
                  onClick={(event) => {
                    event.stopPropagation()
                    props.onApplyAsset(card.id)
                  }}
                >
                  {t('ui.template.applyButtonLabel', {defaultValue: 'Apply'})}
                </Button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  </section>
}