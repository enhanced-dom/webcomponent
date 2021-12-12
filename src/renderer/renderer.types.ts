export interface IRenderingEngine {
  render: (node: Node, args?: any) => void
  addStyle: (name: string, style?: string) => void
}
