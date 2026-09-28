import {
  InitialPartRow,
  InitialLabourRow,
  FinalPartRow,
  FinalLabourRow,
  GstSummaryRow,
  EstimateSummary
} from '../types/survey';

export function calculateSummary(
  initialParts: InitialPartRow[],
  initialLabour: InitialLabourRow[],
  finalParts: FinalPartRow[],
  finalLabour: FinalLabourRow[],
  policyExcessVal: number = 1000,
  salvageVal: number = 0
): { summary: EstimateSummary; gstSummary: GstSummaryRow[] } {
  // Initial Estimate Totals
  const totalPartsEstimated = initialParts.reduce(
    (acc, p) => acc + (Number(p.estimated) || 0),
    0
  );
  const totalLabourEstimated = initialLabour.reduce(
    (acc, l) => acc + (Number(l.estimated) || 0),
    0
  );
  const totalGstEstimatedParts = initialParts.reduce(
    (acc, p) => acc + ((Number(p.estimated) || 0) * (Number(p.gstRate) || 0)) / 100,
    0
  );
  const totalGstEstimatedLabour = initialLabour.reduce(
    (acc, l) => acc + ((Number(l.estimated) || 0) * (Number(l.gstRate) || 0)) / 100,
    0
  );
  const totalGstEstimated = totalGstEstimatedParts + totalGstEstimatedLabour;
  const totalEstimatedAmount = totalPartsEstimated + totalLabourEstimated + totalGstEstimated;

  // Final Estimate Assessed Totals
  const totalPartsAssessed = finalParts.reduce(
    (acc, p) => acc + (Number(p.assessed) || 0),
    0
  );
  const totalDepreciation = finalParts.reduce(
    (acc, p) => acc + (Number(p.depreciationAmount) || 0),
    0
  );
  const netPartsAfterDepreciation = totalPartsAssessed - totalDepreciation;

  const totalLabourAssessed = finalLabour.reduce(
    (acc, l) => acc + (Number(l.assessed) || 0),
    0
  );

  // Group by GST percentages for Final Estimate: 0%, 5%, 12%, 18%, 28%
  const gstBrackets: { [key: number]: number } = {
    0: 0,
    5: 0,
    12: 0,
    18: 0,
    28: 0,
  };

  // Add parts to GST bracket (calculated on net assessed amount of part)
  finalParts.forEach((p) => {
    const rate = Math.round(Number(p.gstRate) || 18);
    const netPart = (Number(p.assessed) || 0) - (Number(p.depreciationAmount) || 0);
    const bracket = [0, 5, 12, 18, 28].includes(rate) ? rate : 18;
    gstBrackets[bracket] += Math.max(0, netPart);
  });

  // Add labour to GST bracket
  finalLabour.forEach((l) => {
    const rate = Math.round(Number(l.gstRate) || 18);
    const assessed = Number(l.assessed) || 0;
    const bracket = [0, 5, 12, 18, 28].includes(rate) ? rate : 18;
    gstBrackets[bracket] += Math.max(0, assessed);
  });

  const gstRows: GstSummaryRow[] = [0, 5, 12, 18, 28].map((pct, idx) => {
    const allowed = Math.round((gstBrackets[pct] || 0) * 100) / 100;
    const totalGstForBracket = Math.round((allowed * (pct / 100)) * 100) / 100;
    const cgst = Math.round((totalGstForBracket / 2) * 100) / 100;
    const sgst = Math.round((totalGstForBracket - cgst) * 100) / 100;
    return {
      id: `gst-${pct}`,
      srNo: idx + 1,
      taxPercentage: pct,
      actualAllowed: allowed,
      cgst,
      sgst,
      igst: 0,
      total: totalGstForBracket,
    };
  });

  const totalGstAssessed = gstRows.reduce((acc, r) => acc + r.total, 0);

  const subTotalAssessed = netPartsAfterDepreciation + totalLabourAssessed;
  const netAssessedAmount = Math.max(0, subTotalAssessed + totalGstAssessed - policyExcessVal - salvageVal);
  const grandTotal = Math.round(netAssessedAmount);

  const sources: { [key: string]: string } = {
    totalParts: `Sum of ${finalParts.length} parts assessed (₹${totalPartsAssessed.toFixed(2)})`,
    totalLabour: `Sum of ${finalLabour.length} labour items assessed (₹${totalLabourAssessed.toFixed(2)})`,
    depreciation: `Itemized parts wear & tear (₹${totalDepreciation.toFixed(2)})`,
    totalGst: `Aggregated 0%, 5%, 12%, 18%, 28% tax buckets (₹${totalGstAssessed.toFixed(2)})`,
    excess: `Policy contractual deductible deduction (₹${policyExcessVal.toFixed(2)})`,
    salvage: `Estimated metal/plastic scrap value deduction (₹${salvageVal.toFixed(2)})`,
    grandTotal: `(Net Parts ₹${netPartsAfterDepreciation.toFixed(2)} + Labour ₹${totalLabourAssessed.toFixed(2)} + GST ₹${totalGstAssessed.toFixed(2)}) - Excess ₹${policyExcessVal} - Salvage ₹${salvageVal}`,
  };

  return {
    summary: {
      totalPartsEstimated: Math.round(totalPartsEstimated * 100) / 100,
      totalPartsAssessed: Math.round(totalPartsAssessed * 100) / 100,
      totalLabourEstimated: Math.round(totalLabourEstimated * 100) / 100,
      totalLabourAssessed: Math.round(totalLabourAssessed * 100) / 100,
      totalGstEstimated: Math.round(totalGstEstimated * 100) / 100,
      totalGstAssessed: Math.round(totalGstAssessed * 100) / 100,
      totalEstimatedAmount: Math.round(totalEstimatedAmount * 100) / 100,
      totalAssessedAmount: Math.round((totalPartsAssessed + totalLabourAssessed + totalGstAssessed) * 100) / 100,
      depreciation: Math.round(totalDepreciation * 100) / 100,
      excess: policyExcessVal,
      salvage: salvageVal,
      netAssessedAmount: Math.round(netAssessedAmount * 100) / 100,
      grandTotal,
      sources,
    },
    gstSummary: gstRows,
  };
}

export function formatINR(val: number | string | null | undefined): string {
  if (val === null || val === undefined || isNaN(Number(val))) return '₹0.00';
  const num = Number(val);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Convert number to Indian English Currency words e.g. "RUPEES THIRTEEN THOUSAND THREE HUNDRED TWENTY-EIGHT ONLY"
export function numberToWordsINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return 'RUPEES ZERO ONLY';
  const num = Math.round(Number(amount));
  if (num === 0) return 'RUPEES ZERO ONLY';

  const units = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
    'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  function convertTwoDigits(n: number): string {
    if (n < 20) return units[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    return tens[t] + (u > 0 ? ' ' + units[u] : '');
  }

  function convertThreeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    let res = '';
    if (h > 0) {
      res += units[h] + ' HUNDRED';
      if (rem > 0) res += ' ' + convertTwoDigits(rem);
    } else if (rem > 0) {
      res += convertTwoDigits(rem);
    }
    return res;
  }

  let words = '';
  let remaining = num;

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  if (crore > 0) {
    words += convertTwoDigits(crore) + ' CRORE ';
  }

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  if (lakh > 0) {
    words += convertTwoDigits(lakh) + ' LAKH ';
  }

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousand > 0) {
    words += convertTwoDigits(thousand) + ' THOUSAND ';
  }

  if (remaining > 0) {
    words += convertThreeDigits(remaining);
  }

  return `RUPEES ${words.trim()} ONLY`;
}

