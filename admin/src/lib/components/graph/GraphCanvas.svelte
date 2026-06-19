<script lang="ts">
  import '@xyflow/svelte/dist/style.css'
  import { SvelteFlow, Background, Controls, MiniMap, SelectionMode } from '@xyflow/svelte'
  import type { Node, Edge, Connection } from '@xyflow/svelte'

  let {
    nodes = $bindable([]),
    edges = $bindable([]),
    nodeTypes = {},
    mode = 'pan' as 'pan' | 'select',
    locked = $bindable(false),
    onNodeClick = undefined as ((id: string) => void) | undefined,
    onBeforeConnect,
  }: {
    nodes?: Node[]
    edges?: Edge[]
    nodeTypes?: Record<string, any>
    mode?: 'pan' | 'select'
    locked?: boolean
    onNodeClick?: (id: string) => void
    onBeforeConnect?: (conn: Connection) => Edge | Connection | void
  } = $props()
</script>

<div class="canvas" class:select-mode={mode === 'select'}>
  <SvelteFlow
    bind:nodes
    bind:edges
    {nodeTypes}
    fitView
    maxZoom={8}
    panOnDrag={mode === 'pan'}
    selectionOnDrag={mode === 'select'}
    selectionMode={SelectionMode.Partial}
    panOnScroll={false}
    zoomOnScroll={true}
    nodesDraggable={!locked}
    nodesConnectable={!locked}
    elementsSelectable={!locked}
    nodesFocusable={true}
    edgesFocusable={true}
    deleteKeyCode="Delete"
    multiSelectionKeyCode="Shift"
    onnodeclick={({ node }) => onNodeClick?.(node.id)}
    onbeforeconnect={(conn) => onBeforeConnect?.(conn)}
  >
    <Background />
    <Controls showLock={false} />
    <MiniMap
      nodeColor={(n) => n.type === 'product' ? '#3A6A00' : '#D97706'}
      maskColor="rgba(0,0,0,0.1)"
    />
  </SvelteFlow>
</div>

<style>
  .canvas {
    flex: 1;
    height: 100%;
  }
  .canvas :global(.svelte-flow__node) {
    cursor: pointer;
  }
  .canvas :global(.svelte-flow__node.dragging) {
    cursor: grabbing;
  }
  .canvas :global(.svelte-flow__pane) {
    cursor: grab;
  }
  .canvas.select-mode :global(.svelte-flow__pane) {
    cursor: crosshair;
  }
</style>
