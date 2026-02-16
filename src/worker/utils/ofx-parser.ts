/**
 * OFX Parser for bank statement imports
 * Parses OFX format and extracts transaction data
 */

export interface OFXTransaction {
  type: 'DEBIT' | 'CREDIT';
  date: string;
  amount: number;
  description: string;
  fitid?: string;
  checkNumber?: string;
  memo?: string;
}

export interface OFXData {
  bankId?: string;
  accountId?: string;
  accountType?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  transactions: OFXTransaction[];
}

/**
 * Extract text content between OFX tags
 */
function extractTagValue(content: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([^<]*)`);
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Parse OFX file content
 */
export function parseOFX(fileContent: string): OFXData {
  const result: OFXData = {
    transactions: []
  };

  // Remove headers and extract only the content after first tag
  let content = fileContent;
  const ofxStartIndex = content.indexOf('<OFX>');
  if (ofxStartIndex !== -1) {
    content = content.substring(ofxStartIndex);
  }

  // Extract bank and account info
  result.bankId = extractTagValue(content, 'BANKID') || undefined;
  result.accountId = extractTagValue(content, 'ACCTID') || undefined;
  result.accountType = extractTagValue(content, 'ACCTTYPE') || undefined;
  result.currency = extractTagValue(content, 'CURDEF') || 'BRL';

  // Extract date range
  result.startDate = extractTagValue(content, 'DTSTART') || undefined;
  result.endDate = extractTagValue(content, 'DTEND') || undefined;

  // Extract transactions
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const transactionBlock = match[1];
    
    const trnType = extractTagValue(transactionBlock, 'TRNTYPE');
    const datePosted = extractTagValue(transactionBlock, 'DTPOSTED');
    const trnAmt = extractTagValue(transactionBlock, 'TRNAMT');
    const fitid = extractTagValue(transactionBlock, 'FITID');
    const checkNum = extractTagValue(transactionBlock, 'CHECKNUM');
    const memo = extractTagValue(transactionBlock, 'MEMO');
    const name = extractTagValue(transactionBlock, 'NAME');

    if (datePosted && trnAmt) {
      // Parse amount
      const amount = Math.abs(parseFloat(trnAmt));
      
      // Determine type (CREDIT = income, DEBIT = expense)
      // Also check amount sign as fallback
      let type: 'DEBIT' | 'CREDIT';
      if (trnType === 'CREDIT' || parseFloat(trnAmt) > 0) {
        type = 'CREDIT';
      } else {
        type = 'DEBIT';
      }

      // Parse date from OFX format (YYYYMMDD or YYYYMMDDHHMMSS)
      const dateStr = datePosted.substring(0, 8);
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const formattedDate = `${year}-${month}-${day}`;

      // Build description from available fields
      const description = memo || name || 'Transação importada';

      result.transactions.push({
        type,
        date: formattedDate,
        amount,
        description,
        fitid: fitid || undefined,
        checkNumber: checkNum || undefined,
        memo: memo || undefined,
      });
    }
  }

  return result;
}

/**
 * Validate OFX file content
 */
export function validateOFX(fileContent: string): { valid: boolean; error?: string } {
  // Check for OFX header
  if (!fileContent.includes('<OFX>') && !fileContent.includes('OFXHEADER')) {
    return { valid: false, error: 'Arquivo não é um OFX válido' };
  }

  // Check for transaction data
  if (!fileContent.includes('<STMTTRN>')) {
    return { valid: false, error: 'Nenhuma transação encontrada no arquivo' };
  }

  return { valid: true };
}
