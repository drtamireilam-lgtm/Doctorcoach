/** Pending-review geometry is a LAB feature, never enabled by a generic preview/staging label. */
export function anatomyLabTarget(target:string|undefined):boolean{
 return target==='local-development'||target==='isolated-staging';
}
export const anatomy3dLabEnabled=anatomyLabTarget(process.env.NEXT_PUBLIC_DC_ANATOMY_TARGET);
