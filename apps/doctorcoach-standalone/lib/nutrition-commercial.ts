/** Proposal only. Integer agorot, no live charge, debt, transfer or partner allocation. */
export const nutritionPlatformBasisPoints=2000;
export function nutritionRevenuePreview(priceAgorot:number){
 if(!Number.isSafeInteger(priceAgorot)||priceAgorot<0||priceAgorot>1000000)throw new Error('הזינו מחיר תקין באגורות.');
 const platformAgorot=Math.round(priceAgorot*nutritionPlatformBasisPoints/10000);
 return {grossAgorot:priceAgorot,platformAgorot,providerAgorot:priceAgorot-platformAgorot,platformBasisPoints:nutritionPlatformBasisPoints,state:'proposal' as const};
}
