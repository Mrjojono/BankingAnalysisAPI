<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte'
  import Badge from '../Badge.svelte'
  import type { NodeProps, Node } from '@xyflow/svelte'
  import type { ProductNodeData } from './types'

  let {
    data = {} as ProductNodeData,
    selected = false,
    dragging = false,
  }: NodeProps<Node<ProductNodeData>> = $props()
</script>

<div class="product-node" class:selected class:dragging class:inactive={!data.isActive}>
  <Handle type="source" position={Position.Right} id="sr" />
  <Handle type="source" position={Position.Bottom} id="sb" />
  <Handle type="target" position={Position.Left} id="tl" />
  <Handle type="target" position={Position.Top} id="tt" />
  <div class="product-node-header">
    <span class="product-code">{data.code}</span>
  </div>
  <div class="product-node-body">
    <span class="product-name">{data.name}</span>
    <Badge category={data.category} />
  </div>
</div>

<style>
  .product-node {
    background: white;
    border: 2px solid #3A6A00;
    border-radius: 8px;
    padding: 0;
    min-width: 180px;
    font-family: system-ui, sans-serif;
    font-size: 13px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .product-node.selected {
    border-color: #2563EB;
    box-shadow: 0 0 0 2px rgba(37,99,235,0.3);
  }
  .product-node.dragging {
    opacity: 0.8;
    box-shadow: 0 8px 16px rgba(0,0,0,0.15);
  }
  .product-node.inactive {
    opacity: 0.7;
    border-color: #9CA3AF;
  }
  .product-node.inactive .product-node-header {
    background: #9CA3AF;
  }
  .product-node-header {
    background: #3A6A00;
    color: white;
    padding: 6px 12px;
    border-radius: 6px 6px 0 0;
    font-weight: 600;
    font-size: 12px;
  }
  .product-node-body {
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .product-name {
    font-weight: 600;
    color: #1F2937;
    font-size: 14px;
  }
</style>
