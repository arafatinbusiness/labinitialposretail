/**
 * Currency display utility
 * Maps currency symbols to display strings, especially for PDF generation
 * where certain symbols may not render correctly in default fonts.
 */

import { BusinessSettings } from '../types';

export class CurrencyService {
  /**
   * Get display currency string for a given currency code/symbol
   * @param currency The currency string (e.g., "$", "৳", "BDT", "tk")
   * @returns The display currency string (e.g., "$", "BDT", "tk")
   */
  static getDisplayCurrency(currency: string): string {
    // Map unsupported symbols to display-friendly strings
    const currencyMap: Record<string, string> = {
      '৳': 'BDT', // Bangladeshi Taka symbol -> BDT
      'tk': 'BDT', // tk also maps to BDT
      // Add other mappings as needed
    };
    
    return currencyMap[currency] || currency;
  }

  /**
   * Get display currency for business settings
   * @param business Business settings
   * @returns Display currency string
   */
  static getBusinessDisplayCurrency(business: BusinessSettings): string {
    return this.getDisplayCurrency(business.currency || '$');
  }

  /**
   * Format amount with currency
   * @param amount The amount
   * @param currency The currency string
   * @param decimals Number of decimal places (default 2)
   * @returns Formatted string like "BDT100.00"
   */
  static formatAmount(amount: number, currency: string, decimals: number = 2): string {
    const displayCurrency = this.getDisplayCurrency(currency);
    return `${displayCurrency}${amount.toFixed(decimals)}`;
  }

  /**
   * Format amount with currency and a space between currency and amount
   * @param amount The amount
   * @param currency The currency string
   * @param decimals Number of decimal places (default 2)
   * @returns Formatted string like "BDT 100.00"
   */
  static formatAmountWithSpace(amount: number, currency: string, decimals: number = 2): string {
    const displayCurrency = this.getDisplayCurrency(currency);
    return `${displayCurrency} ${amount.toFixed(decimals)}`;
  }

  /**
   * Format amount with business currency
   * @param amount The amount
   * @param business Business settings
   * @param decimals Number of decimal places (default 2)
   * @returns Formatted string
   */
  static formatAmountWithBusiness(amount: number, business: BusinessSettings, decimals: number = 2): string {
    return this.formatAmount(amount, business.currency || '$', decimals);
  }

  /**
   * Format amount with business currency and a space
   * @param amount The amount
   * @param business Business settings
   * @param decimals Number of decimal places (default 2)
   * @returns Formatted string
   */
  static formatAmountWithBusinessSpace(amount: number, business: BusinessSettings, decimals: number = 2): string {
    return this.formatAmountWithSpace(amount, business.currency || '$', decimals);
  }
}
