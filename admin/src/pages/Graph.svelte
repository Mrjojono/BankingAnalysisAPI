<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { Grab, Crosshair, Lock, Unlock } from '@lucide/svelte'
  import { api } from '../lib/api'
  import Drawer from '../lib/components/Drawer.svelte'
  import Input from '../lib/components/Input.svelte'
  import GraphCanvas from '../lib/components/graph/GraphCanvas.svelte'
  import ProductNode from '../lib/components/graph/ProductNode.svelte'
  import RuleNode from '../lib/components/graph/RuleNode.svelte'
  import type { Node, Edge, Connection } from '@xyflow/svelte'
  import type { RuleNodeData } from '../lib/components/graph/types'

  let {
    productId = null as string | null,
    ruleId = null as string | null,
    onNavigate = undefined as ((p: string, id?: string | null, ruleId?: string | null) => void) | undefined,
  } = $props()

  let products = $state<any[]>([])
  let allRules = $state<RuleNodeData[]>([])
  let loading = $state(true)
  let error = $state('')

  let ruleDrawerOpen = $state(false)
  let productDrawerOpen = $state(false)
  let editing = $state<RuleNodeData | null>(null)
  let editingProduct = $state<any | null>(null)
  let saving = $state(false)
  let saveStatus = $state('')

  let nodes = $state.raw<Node[]>([])
  let edges = $state.raw<Edge[]>([])
  let nodeTypes = { product: ProductNode as any, rule: RuleNode as any }
  let sidebarOpen = $state(true)
  let canvasMode = $state<'pan' | 'select'>('pan')
  let locked = $state(false)
  let ruleTypeFilter = $state('')
  let canvasFilter = $state('')
  let nextTempId = $state(1)

  $effect(() => {
    const f = canvasFilter
    untrack(() => applyCanvasFilter(f))
  })

  function applyCanvasFilter(f: string) {
    if (!f) {
      const hasHidden = nodes.some(n => n.hidden) || edges.some(e => e.hidden)
      if (!hasHidden) return
      nodes = nodes.map(n => {
        if (!n.hidden) return n
        const { hidden, ...rest } = n
        return rest as Node
      })
      edges = edges.map(e => {
        if (!e.hidden) return e
        const { hidden, ...rest } = e
        return rest as Edge
      })
    } else {
      nodes = nodes.map(n => {
        if (n.type === 'rule') return { ...n, hidden: (n.data as RuleNodeData).type !== f }
        return { ...n, hidden: false }
      })
      const hiddenIds = new Set(nodes.filter(n => n.hidden).map(n => n.id))
      edges = edges.map(e => ({ ...e, hidden: hiddenIds.has(e.source) || hiddenIds.has(e.target) }))
    }
  }

  onMount(async () => {
    try {
      const [p, r] = await Promise.all([api.listProducts(), api.listRules()])
      products = p
      allRules = r.map(normalizeRule)
      if (productId) buildProductGraph(productId)
      if (ruleId) buildRuleGraph(ruleId)
    } catch (e: any) {
      error = e.message ?? 'Erreur chargement'
    } finally {
      loading = false
    }
  })

  function normalizeRule(rule: any): RuleNodeData {
    return {
      id: rule.id, productId: rule.productId, code: rule.code, label: rule.label,
      type: rule.type, field: rule.field, operator: rule.operator, value: rule.value,
      valueMin: rule.valueMin, valueMax: rule.valueMax,
      percentage: rule.percentage, flatAmount: rule.flatAmount,
      minAmount: rule.minAmount, maxAmount: rule.maxAmount,
      currency: rule.currency, period: rule.period,
      weight: rule.weight ?? 0, priority: rule.priority ?? 0,
      description: rule.description, isActive: rule.isActive,
    }
  }

  function buildProductGraph(pid: string) {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []
    const product = products.find(p => p.id === pid)
    if (!product) return

    newNodes.push({
      id: `p-${product.id}`, type: 'product',
      position: { x: 50, y: 80 },
      data: { id: product.id, code: product.code, name: product.name, category: product.category, isActive: product.isActive },
      draggable: true,
    })
    const productRules = allRules.filter(r => r.productId === pid)
    productRules.forEach((r, i) => {
      newNodes.push({
        id: `r-${r.id}`, type: 'rule',
        position: { x: 320, y: i * 120 + 20 },
        data: { ...r }, draggable: true,
      })
      newEdges.push({
        id: `e-p${product.id}-r${r.id}`, source: `p-${product.id}`, target: `r-${r.id}`,
        animated: true, style: 'stroke: #3A6A00; stroke-width: 2px',
      })
    })
    nodes = newNodes
    edges = newEdges
  }

  function buildRuleGraph(rid: string) {
    const rule = allRules.find(r => r.id === rid)
    if (!rule) return
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    if (rule.productId) {
      const product = products.find(p => p.id === rule.productId)
      if (product) {
        newNodes.push({
          id: `p-${product.id}`, type: 'product',
          position: { x: 50, y: 80 },
          data: { id: product.id, code: product.code, name: product.name, category: product.category, isActive: product.isActive },
          draggable: true,
        })
      }
      const productRules = allRules.filter(r => r.productId === rule.productId)
      productRules.forEach((r, i) => {
        newNodes.push({
          id: `r-${r.id}`, type: 'rule',
          position: { x: 320, y: i * 120 + 20 },
          data: { ...r }, draggable: true,
        })
        newEdges.push({
          id: `e-p${rule.productId}-r${r.id}`, source: `p-${rule.productId}`, target: `r-${r.id}`,
          animated: true, style: 'stroke: #3A6A00; stroke-width: 2px',
        })
      })
    } else {
      newNodes.push({
        id: `r-${rule.id}`, type: 'rule',
        position: { x: 50, y: 80 },
        data: { ...rule }, draggable: true,
      })
    }
    nodes = newNodes
    edges = newEdges
  }

  function addProductToCanvas(p: any) {
    if (nodes.some(n => n.id === `p-${p.id}`)) return
    const offset = nodes.length * 40
    nodes = [...nodes, {
      id: `p-${p.id}`, type: 'product',
      position: { x: 60 + offset, y: 80 + offset },
      data: { id: p.id, code: p.code, name: p.name, category: p.category, isActive: p.isActive },
      draggable: true,
    }]
    const linkedRules = allRules.filter(r => r.productId === p.id)
    linkedRules.forEach((r, i) => {
      if (nodes.some(n => n.id === `r-${r.id}`)) return
      nodes = [...nodes, {
        id: `r-${r.id}`, type: 'rule',
        position: { x: 330 + offset, y: 80 + offset + i * 100 },
        data: { ...r }, draggable: true,
      }]
      edges = [...edges, {
        id: `e-p${p.id}-r${r.id}`,
        source: `p-${p.id}`, target: `r-${r.id}`,
        animated: true, style: 'stroke: #3A6A00; stroke-width: 2px',
      }]
    })
    if (canvasFilter) applyCanvasFilter(canvasFilter)
  }

  function addRuleToCanvas(r: RuleNodeData) {
    if (nodes.some(n => n.id === `r-${r.id}`)) return
    const offset = nodes.length * 40
    nodes = [...nodes, {
      id: `r-${r.id}`, type: 'rule',
      position: { x: 400 + offset, y: 80 + offset },
      data: { ...r }, draggable: true,
    }]
    if (canvasFilter) applyCanvasFilter(canvasFilter)
  }

  function handleConnect(conn: Connection): Edge | Connection {
    return {
      id: `e-${conn.source}-${conn.target}-${Date.now()}`,
      source: conn.source,
      target: conn.target,
      sourceHandle: conn.sourceHandle,
      targetHandle: conn.targetHandle,
      animated: true,
      style: 'stroke: #3A6A00; stroke-width: 2px',
    }
  }

  function onNodeClick(id: string) {
    if (id.startsWith('p-')) {
      const p = products.find(x => x.id === id.slice(2))
      if (p) { editingProduct = { ...p }; productDrawerOpen = true }
    } else {
      const rule = id.startsWith('r-') ? allRules.find(r => r.id === id.slice(2)) : null
      if (rule) { editing = { ...rule, description: rule.description ?? '' }; ruleDrawerOpen = true }
    }
  }

  function newRule() {
    editing = {
      id: undefined as any,
      productId: null,
      code: '', label: '', description: '',
      type: 'ELIGIBILITY',
      field: 'monthlyIncome',
      operator: 'GREATER_THAN',
      value: 0,
      isActive: true,
    }
    ruleDrawerOpen = true
  }

  function newProduct() {
    editingProduct = {
      id: undefined as any,
      code: '', name: '', category: 'ACCOUNT', isActive: true,
    }
    productDrawerOpen = true
  }

  async function saveProduct() {
    if (!editingProduct) return
    saving = true
    try {
      const clean: Record<string, any> = {
        code: editingProduct.code,
        name: editingProduct.name,
        description: editingProduct.description ?? undefined,
        reference: editingProduct.reference ?? undefined,
        category: editingProduct.category ?? undefined,
        isActive: editingProduct.isActive ?? true,
      }
      Object.keys(clean).forEach(k => clean[k] === undefined && delete clean[k])
      let created: any
      if (editingProduct.id) {
        created = await api.updateProduct(editingProduct.id, clean)
      } else {
        created = await api.createProduct(clean)
      }
      products = products.map(p => p.id === created.id ? created : p)
      if (!products.find(p => p.id === created.id)) products = [...products, { ...created, rules: [] }]
      nodes = nodes.map(n =>
        n.id === `p-${created.id}`
          ? { ...n, data: { ...n.data, name: created.name, code: created.code, category: created.category, isActive: created.isActive } }
          : n
      )
      if (!nodes.some(n => n.id === `p-${created.id}`)) {
        const offset = nodes.length * 40
        nodes = [...nodes, {
          id: `p-${created.id}`, type: 'product',
          position: { x: 60 + offset, y: 80 + offset },
          data: { id: created.id, code: created.code, name: created.name, category: created.category, isActive: created.isActive },
          draggable: true,
        }]
      }
      productDrawerOpen = false; editingProduct = null
    } catch (e: any) { error = e.message ?? 'Erreur' }
    finally { saving = false }
  }

  async function saveRule() {
    if (!editing) return
    saving = true
    try {
      const payload = { ...editing, value: editing.value ? Number(editing.value) : undefined }
      let created: any
      if (editing.id) {
        await api.updateRule(editing.id, payload)
      } else {
        created = await api.createRule(payload)
      }
      allRules = (await api.listRules()).map(normalizeRule)
      if (created) {
        addRuleToCanvas(normalizeRule(created))
      } else {
        nodes = nodes.map(n => {
          if (n.type === 'rule' && (n.data as RuleNodeData).id === payload.id) {
            return { ...n, data: { ...n.data, ...payload } }
          }
          return n
        })
        if (canvasFilter) applyCanvasFilter(canvasFilter)
      }
      ruleDrawerOpen = false; editing = null
    } catch (e: any) { error = e.message ?? 'Erreur' }
    finally { saving = false }
  }

  async function saveCanvas() {
    saving = true; saveStatus = ''

    const productRuleMap = new Map<string, string[]>()
    const allRuleIdsOnCanvas = new Set<string>()

    for (const n of nodes) {
      if (n.type === 'rule') {
        const rid = (n.data as RuleNodeData).id
        if (rid) allRuleIdsOnCanvas.add(rid)
      }
    }

    for (const edge of edges) {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      if (!sourceNode || !targetNode) continue
      if (sourceNode.type === 'product' && targetNode.type === 'rule') {
        const pid = (sourceNode.data as any).id
        const rid = (targetNode.data as RuleNodeData).id
        if (pid && rid) {
          if (!productRuleMap.has(pid)) productRuleMap.set(pid, [])
          productRuleMap.get(pid)!.push(rid)
        }
      }
    }

    const connectedIds = new Set<string>()
    const updates: Promise<any>[] = []

    for (const [pid, ruleIds] of productRuleMap) {
      for (const rid of ruleIds) connectedIds.add(rid)
      updates.push(api.updateProductRules(pid, ruleIds))
    }

    for (const rid of allRuleIdsOnCanvas) {
      if (!connectedIds.has(rid)) {
        updates.push(api.updateRule(rid, { productId: null }))
      }
    }

    try {
      await Promise.all(updates)
      allRules = (await api.listRules()).map(normalizeRule)
      nodes = nodes.map(n => {
        if (n.type === 'rule') {
          const updated = allRules.find(r => r.id === (n.data as RuleNodeData).id)
          if (updated) return { ...n, data: { ...updated } }
        }
        return n
      })
      saveStatus = 'Canvas enregistré'
    } catch (e: any) {
      saveStatus = 'Erreur : ' + (e.message ?? '')
      console.error(e)
    } finally { saving = false; setTimeout(() => saveStatus = '', 4000) }
  }
</script>

{#if loading}
  <div class="flex justify-center p-16"><div class="w-8 h-8 border-[3px] border-gray-200 border-t-[#3A6A00] rounded-full animate-spin"></div></div>
{:else if error}
  <div class="p-5 text-red-500 font-semibold text-center">{error}</div>
{:else}
  <div class="flex h-[calc(100vh-120px)] border border-gray-200 rounded-lg overflow-hidden relative">
    {#if !productId || ruleId}
      <button class="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-5 h-10 bg-white border border-gray-200 border-l-0 rounded-r-md cursor-pointer text-[10px] flex items-center justify-center text-gray-500 hover:bg-gray-100" onclick={() => sidebarOpen = !sidebarOpen}>
        {sidebarOpen ? '◀' : '▶'}
      </button>
    {/if}
    {#if (!productId || ruleId) && sidebarOpen}
      <div class="w-[260px] border-r border-gray-200 bg-gray-50 flex flex-col overflow-y-auto">
        <div class="px-3.5 py-3 border-b border-gray-200">
          <h3 class="m-0 text-[13px] font-bold text-gray-800">Boîte à outils</h3>
          {#if ruleId}
            {#each allRules.filter(r => r.id === ruleId) as ctx}
              <p class="m-0 mt-1 text-[11px] text-gray-500">Règle : <strong>{ctx.label || ctx.code}</strong></p>
            {/each}
          {/if}
        </div>

        <div class="border-b border-gray-200">
          <div class="flex items-center justify-between px-3.5 pt-2.5 pb-1 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
            <span>Produits</span>
            <span class="text-[10px] font-semibold text-white bg-[#3A6A00] rounded-full px-1.5 py-0.5">{products.length}</span>
          </div>
          <div class="px-2.5 pb-2.5 pt-1.5">
            <input class="w-full px-2 py-1.5 border border-gray-200 rounded-md text-[12px] mb-1.5 box-border focus:border-[#3A6A00] focus:outline-none" type="text" placeholder="Filtrer produits..." oninput={(e) => {
              const el = e.target as HTMLInputElement
              const list = el.parentElement!.nextElementSibling as HTMLElement
              if (list) {
                const items = list.querySelectorAll('.tool-item')
                const q = el.value.toLowerCase()
                items.forEach(item => {
                  const text = (item as HTMLElement).dataset.search ?? ''
                  ;(item as HTMLElement).style.display = text.includes(q) ? '' : 'none'
                })
              }
            }} />
            <div class="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto">
              {#each products as p}
                <button class="flex items-center justify-between px-2 py-1.5 border border-transparent rounded bg-white cursor-pointer text-[12px] text-left w-full hover:border-[#3A6A00] hover:bg-[#F0F7E6]" data-search={[p.name, p.code].join(' ').toLowerCase()} onclick={() => addProductToCanvas(p)}>
                  <span class="font-medium text-gray-800 truncate min-w-0">{p.name}</span>
                  <span class="text-[10px] text-gray-500 shrink-0 ml-1.5">{p.code}</span>
                </button>
              {/each}
            </div>
          </div>
        </div>

        <div class="border-b border-gray-200">
          <div class="flex items-center justify-between px-3.5 pt-2.5 pb-1 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
            <span>Règles</span>
            <span class="text-[10px] font-semibold text-white bg-[#3A6A00] rounded-full px-1.5 py-0.5">{allRules.length}</span>
          </div>
          <div class="px-2.5 pb-2.5 pt-1.5">
            <select class="w-full px-2 py-1.5 border border-gray-200 rounded-md text-[12px] mb-1.5 box-border focus:border-[#3A6A00] focus:outline-none bg-white" bind:value={ruleTypeFilter}>
              <option value="">Tous les types</option>
              <option value="ELIGIBILITY">Éligibilité</option>
              <option value="FEE">Frais</option>
              <option value="LIMIT">Limite</option>
              <option value="INTEREST">Intérêt</option>
              <option value="VALUE_DATE">Date valeur</option>
            </select>
            <input class="w-full px-2 py-1.5 border border-gray-200 rounded-md text-[12px] mb-1.5 box-border focus:border-[#3A6A00] focus:outline-none" type="text" placeholder="Filtrer règles..." oninput={(e) => {
              const el = e.target as HTMLInputElement
              const list = el.parentElement!.nextElementSibling as HTMLElement
              if (list) {
                const items = list.querySelectorAll('.tool-item')
                const q = el.value.toLowerCase()
                items.forEach(item => {
                  const text = (item as HTMLElement).dataset.search ?? ''
                  ;(item as HTMLElement).style.display = text.includes(q) ? '' : 'none'
                })
              }
            }} />
            <div class="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto">
              {#each allRules.filter(r => !ruleTypeFilter || r.type === ruleTypeFilter) as r}
                <button class="flex items-center justify-between px-2 py-1.5 border border-transparent rounded bg-white cursor-pointer text-[12px] text-left w-full hover:border-[#3A6A00] hover:bg-[#F0F7E6]" data-search={[r.label, r.code, r.field].join(' ').toLowerCase()} onclick={() => addRuleToCanvas(r)}>
                  <span class="font-medium text-gray-800 truncate min-w-0">{r.label || 'Sans libellé'}</span>
                  <span class="text-[10px] text-gray-500 shrink-0 ml-1.5">{r.code}</span>
                </button>
              {/each}
            </div>
          </div>
        </div>

        <div class="px-3.5 py-2.5 text-[11px] text-gray-400 border-t border-gray-200 mt-auto">
          <p class="m-0">Cliquez pour ajouter au canva, puis connectez en glissant</p>
        </div>
      </div>
    {:else if productId && !ruleId}
      <div class="w-[260px] border-r border-gray-200 bg-gray-50 flex flex-col px-3.5 py-3 gap-2.5 overflow-y-auto">
        <div>
          <h3 class="m-0 text-[15px] font-bold text-gray-800">{products.find(p => p.id === productId)?.name ?? 'Produit'}</h3>
        </div>
        <div class="flex items-center justify-between pt-2.5 pb-1 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Règles liées</div>
        <div class="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto">
          {#each allRules.filter(r => r.productId === productId) as r}
            <button class="flex items-center justify-between px-2 py-1.5 border border-transparent rounded bg-white cursor-pointer text-[12px] text-left w-full hover:border-[#3A6A00] hover:bg-[#F0F7E6]" onclick={() => { editing = { ...r, description: r.description ?? '' }; ruleDrawerOpen = true }}>
              <span class="font-medium text-gray-800 truncate min-w-0">{r.label || r.code}</span>
              <span class="text-[10px] text-gray-500 shrink-0 ml-1.5">{r.type}</span>
            </button>
          {:else}
            <div class="text-[12px] text-gray-400 py-2.5 text-center">Aucune règle liée</div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="flex-1 flex flex-col min-w-0">
      <div class="flex items-center gap-3 px-3.5 py-2 border-b border-gray-200 bg-white shrink-0">
        <button class="text-[12px] font-semibold text-white bg-[#3A6A00] border-0 rounded-md px-3.5 py-1.5 cursor-pointer hover:bg-[#2D5200] disabled:opacity-50 disabled:cursor-wait" onclick={saveCanvas} disabled={saving}>
          {saving ? 'Sauvegarde…' : 'Enregistrer le canva'}
        </button>
        <button class="text-[12px] font-semibold px-3 py-1.5 rounded-md border cursor-pointer {canvasMode === 'select' ? 'bg-[#3A6A00] text-white border-[#3A6A00]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}" onclick={() => canvasMode = canvasMode === 'pan' ? 'select' : 'pan'} title={canvasMode === 'pan' ? 'Mode sélection' : 'Mode déplacement'}>
          {#if canvasMode === 'pan'}
            <Grab size={16} />
          {:else}
            <Crosshair size={16} />
          {/if}
        </button>
        <button class="text-[12px] font-semibold px-3 py-1.5 rounded-md border cursor-pointer {locked ? 'bg-amber-100 text-amber-700 border-amber-400' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}" onclick={() => locked = !locked} title={locked ? 'Déverrouiller le canva' : 'Verrouiller le canva'}>
          {#if locked}
            <Lock size={16} />
          {:else}
            <Unlock size={16} />
          {/if}
        </button>
        <select class="text-[12px] px-2 py-1.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:border-[#3A6A00] focus:outline-none" bind:value={canvasFilter}>
          <option value="">Tous</option>
          <option value="ELIGIBILITY">Éligibilité</option>
          <option value="FEE">Frais</option>
          <option value="LIMIT">Limite</option>
          <option value="INTEREST">Intérêt</option>
          <option value="VALUE_DATE">Date valeur</option>
        </select>
        <div class="w-px h-5 bg-gray-200 shrink-0"></div>
        <button class="text-[12px] font-semibold text-[#3A6A00] bg-[#F0F7E6] border border-[#3A6A00] rounded-md px-3 py-1.5 cursor-pointer hover:bg-[#D4EDB0]" onclick={newProduct}>+ Produit</button>
        <button class="text-[12px] font-semibold text-[#3A6A00] bg-[#F0F7E6] border border-[#3A6A00] rounded-md px-3 py-1.5 cursor-pointer hover:bg-[#D4EDB0]" onclick={newRule}>+ Règle</button>
        {#if saveStatus}
          <span class="text-[12px] text-[#3A6A00] font-medium">{saveStatus}</span>
        {/if}
      </div>
      <GraphCanvas
        {nodeTypes}
        bind:nodes
        bind:edges
        mode={canvasMode}
        bind:locked
        onNodeClick={onNodeClick}
        onBeforeConnect={handleConnect}
      />
    </div>
  </div>
{/if}

<Drawer open={productDrawerOpen} title="Modifier le produit" onclose={() => { productDrawerOpen = false; editingProduct = null }}>
  {#if editingProduct}
    <div class="flex flex-col gap-3 py-1">
      <Input label="Code" bind:value={editingProduct.code} />
      <Input label="Nom" bind:value={editingProduct.name} />
      <div class="flex flex-col gap-1">
        <label for="prod-category" class="text-[12px] font-semibold text-gray-700">Catégorie</label>
        <select id="prod-category" bind:value={editingProduct.category}>
          <option value="ACCOUNT">Compte</option>
          <option value="CARD">Carte</option>
          <option value="LOAN">Crédit</option>
          <option value="PAYMENT">Paiement</option>
          <option value="DIGITAL">Digital</option>
          <option value="BANKING">Services bancaires</option>
          <option value="INCIDENT">Incident</option>
          <option value="FOREX">Change</option>
          <option value="INTERNATIONAL">International</option>
          <option value="MISC">Autres</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-[12px] font-semibold text-gray-700">
          <input type="checkbox" bind:checked={editingProduct.isActive} />
          Actif
        </label>
      </div>
      <button class="text-[13px] font-semibold text-white bg-[#3A6A00] border-0 rounded-md px-4 py-2 cursor-pointer hover:bg-[#2D5200] disabled:opacity-50 disabled:cursor-wait" onclick={saveProduct} disabled={saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
      {#if onNavigate && editingProduct?.id}
        <button class="text-[12px] font-medium text-[#3A6A00] bg-white border border-[#3A6A00] rounded-md px-3.5 py-1.5 cursor-pointer hover:bg-[#F0F7E6]" onclick={() => { productDrawerOpen = false; onNavigate('products') }}>Voir dans la page Produits</button>
      {/if}
    </div>
  {/if}
</Drawer>

<Drawer open={ruleDrawerOpen} title={editing?.id ? 'Modifier la règle' : 'Nouvelle règle'} onclose={() => { ruleDrawerOpen = false; editing = null }}>
  {#if editing}
    <div class="flex flex-col gap-3 py-1">
      <Input label="Code" bind:value={editing.code} />
      <Input label="Libellé" bind:value={editing.label} />
      <Input label="Description" bind:value={editing.description} />
      <div class="flex flex-col gap-1">
        <label for="rule-type" class="text-[12px] font-semibold text-gray-700">Type</label>
        <select id="rule-type" class="px-2.5 py-1.5 border border-gray-200 rounded-md text-[13px] focus:border-[#3A6A00] focus:outline-none" bind:value={editing.type}>
          <option value="ELIGIBILITY">Éligibilité</option>
          <option value="FEE">Frais</option>
          <option value="LIMIT">Limite</option>
          <option value="INTEREST">Intérêt</option>
          <option value="VALUE_DATE">Date valeur</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="rule-field" class="text-[12px] font-semibold text-gray-700">Champ</label>
        <select id="rule-field" class="px-2.5 py-1.5 border border-gray-200 rounded-md text-[13px] focus:border-[#3A6A00] focus:outline-none" bind:value={editing.field}>
          <option value="monthlyIncome">Revenu mensuel</option>
          <option value="debtRatio">Taux d'endettement</option>
          <option value="expenseRatio">Ratio dépenses</option>
          <option value="savingsRate">Taux d'épargne</option>
          <option value="overdraftDays">Jours découvert</option>
          <option value="balanceVolatility">Volatilité solde</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="rule-operator" class="text-[12px] font-semibold text-gray-700">Opérateur</label>
        <select id="rule-operator" class="px-2.5 py-1.5 border border-gray-200 rounded-md text-[13px] focus:border-[#3A6A00] focus:outline-none" bind:value={editing.operator}>
          <option value="GREATER_THAN">&gt;</option>
          <option value="LESS_THAN">&lt;</option>
          <option value="EQUALS">=</option>
          <option value="GREATER_OR_EQUAL">&gt;=</option>
          <option value="LESS_OR_EQUAL">&lt;=</option>
          <option value="BETWEEN">Entre</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="rule-value" class="text-[12px] font-semibold text-gray-700">Valeur</label>
        <input id="rule-value" class="px-2.5 py-1.5 border border-gray-200 rounded-md text-[13px] focus:border-[#3A6A00] focus:outline-none" type="number" bind:value={editing.value} />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-[12px] font-semibold text-gray-700">
          <input type="checkbox" bind:checked={editing.isActive} />
          Actif
        </label>
      </div>
    </div>
  {/if}
  <button class="text-[13px] font-semibold text-gray-500 bg-white border border-gray-200 rounded-md px-4 py-2 cursor-pointer" onclick={() => { ruleDrawerOpen = false; editing = null }}>Annuler</button>
  <button class="text-[13px] font-semibold text-white bg-[#3A6A00] border-0 rounded-md px-4 py-2 cursor-pointer hover:bg-[#2D5200] disabled:opacity-50 disabled:cursor-wait" onclick={saveRule} disabled={saving}>
    {saving ? 'Enregistrement…' : 'Enregistrer'}
  </button>
  {#if onNavigate && editing?.id}
    <button class="text-[12px] font-medium text-[#3A6A00] bg-white border border-[#3A6A00] rounded-md px-3.5 py-1.5 cursor-pointer hover:bg-[#F0F7E6]" onclick={() => { ruleDrawerOpen = false; onNavigate('rules') }}>Voir dans la page Règles</button>
  {/if}
</Drawer>
