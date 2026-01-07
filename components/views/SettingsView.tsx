import React, { useState } from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { BusinessSettings, UserRole } from '../../types';

const SettingsView = ({ business, setBusiness, t, userRole, onSave }: { 
  business: BusinessSettings, 
  setBusiness: React.Dispatch<React.SetStateAction<BusinessSettings>>, 
  t: (key: string) => string,
  userRole: UserRole,
  onSave?: () => void
}) => {
  // All roles can access settings (admin, cashier, salesman, manager)
  // No restriction needed
  
  // State for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <h2 className="text-2xl font-bold text-gray-800">{t('settings')}</h2>
       
       {/* Business Settings Section */}
       <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
          <Input 
             label={t('business_name')} 
             value={business.name} 
             onChange={e => setBusiness({...business, name: e.target.value})} 
          />
          <Input 
             label="Owner Name (Shown in Invoices)" 
             value={business.ownerName || ''} 
             onChange={e => setBusiness({...business, ownerName: e.target.value})} 
             placeholder="Enter owner name (e.g., Ranjit, Shawon)"
          />
          <Input 
             label={t('address')} 
             value={business.address} 
             onChange={e => setBusiness({...business, address: e.target.value})} 
          />
          <Input 
             label={t('phone')} 
             value={business.phone} 
             onChange={e => setBusiness({...business, phone: e.target.value})} 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
               <label className="text-sm font-medium text-gray-700 mb-1 block">Print Format</label>
               <select 
                 className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                 value={business.printFormat} 
                 onChange={e => setBusiness({...business, printFormat: e.target.value as 'a4' | 'thermal'})}
               >
                  <option value="a4">A4 (Standard)</option>
                  <option value="thermal">Thermal (POS)</option>
               </select>
            </div>
            <div>
               <label className="text-sm font-medium text-gray-700 mb-1 block">{t('product_view')}</label>
               <select 
                 className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                 value={business.productViewMode || 'grid'} 
                 onChange={e => setBusiness({...business, productViewMode: e.target.value as 'grid' | 'list'})}
               >
                  <option value="grid">{t('grid_view')}</option>
                  <option value="list">{t('list_view')}</option>
               </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t('currency')}</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none font-sans"
                  value={business.currency || '$'} 
                  onChange={e => setBusiness({...business, currency: e.target.value})}
                >
                  <option value="$">$ (Dollar)</option>
                  <option value="BDT">BDT</option>
                  <option value="SR">SR (Saudi Riyal)</option>
                  <option value="€">€ (Euro)</option>
                  <option value="£">£ (Pound)</option>
                  <option value="₹">₹ (Rupee)</option>
                  <option value="AED">AED</option>
                  <option value="¥">¥ (Yen)</option>
                </select>
             </div>
             <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">QR Code Type</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={business.qrCodeType || 'universal'} 
                  onChange={e => setBusiness({...business, qrCodeType: e.target.value as 'universal' | 'zatca'})}
                >
                  <option value="universal">Universal (Web URL)</option>
                  <option value="zatca">ZATCA (Saudi Tax Compliance)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {business.qrCodeType === 'universal' 
                    ? 'Simple web URL for invoice verification' 
                    : 'Base64 encoded TLV data for Saudi Arabian tax compliance (ZATCA)'}
                </p>
             </div>
          </div>

          {/* Stock Management Toggle */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Stock Management</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Enable or disable stock tracking and validation. When disabled, products can be sold regardless of stock levels.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={business.stockManagementEnabled !== false} // Default to true if undefined
                  onChange={e => setBusiness({...business, stockManagementEnabled: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              <p className="font-medium">Current Status: <span className={business.stockManagementEnabled !== false ? 'text-green-600' : 'text-red-600'}>
                {business.stockManagementEnabled !== false ? 'ENABLED' : 'DISABLED'}
              </span></p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>When <span className="font-medium">ENABLED</span>: Stock is tracked, out-of-stock products cannot be sold</li>
                <li>When <span className="font-medium">DISABLED</span>: Stock is ignored, all products can be sold regardless of stock levels</li>
                <li>Default: <span className="font-medium">ENABLED</span> (for new stores)</li>
              </ul>
            </div>
          </div>

          {/* PDF Upload Toggle */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">PDF Cloud Storage</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Save PDFs to cloud for sharing. When disabled, invoices save instantly but won't have shareable links.
                </p>
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  Note: PDF upload takes ~4 seconds to generate and upload invoice.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={business.pdfUploadEnabled !== false} // Default to true if undefined
                  onChange={e => setBusiness({...business, pdfUploadEnabled: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              <p className="font-medium">Current Status: <span className={business.pdfUploadEnabled !== false ? 'text-green-600' : 'text-red-600'}>
                {business.pdfUploadEnabled !== false ? 'ENABLED' : 'DISABLED'}
              </span></p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>When <span className="font-medium">ENABLED</span>: PDFs are uploaded to cloud, invoices have shareable links</li>
                <li>When <span className="font-medium">DISABLED</span>: Invoices save instantly (~1 second), no PDF links</li>
                <li>Default: <span className="font-medium">ENABLED</span> (for backward compatibility)</li>
              </ul>
              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                <p className="font-medium">Performance Impact:</p>
                <p>• <span className="font-medium">ENABLED</span>: Invoice creation takes ~4-5 seconds (PDF generation + upload)</p>
                <p>• <span className="font-medium">DISABLED</span>: Invoice creation takes ~1 second (instant)</p>
              </div>
            </div>
          </div>

          {/* Registration/Tax ID Field */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Registration/Tax ID"
              value={business.taxId || ''}
              onChange={e => setBusiness({...business, taxId: e.target.value})}
              placeholder="Enter business registration or tax ID"
            />
            <div className="space-y-2">
              <Input 
                label="Tax Label (English)"
                value={business.taxLabelEnglish || ''}
                onChange={e => setBusiness({...business, taxLabelEnglish: e.target.value})}
                placeholder="e.g., VAT, Tax ID, CR"
              />
              <Input 
                label="Tax Label (Arabic)"
                value={business.taxLabelArabic || ''}
                onChange={e => setBusiness({...business, taxLabelArabic: e.target.value})}
                placeholder="e.g., ضريبة القيمة المضافة"
              />
            </div>
          </div>

          {/* ZATCA Settings (Conditional) */}
          {business.qrCodeType === 'zatca' && (
            <div className="border border-gray-200 rounded-lg p-4 mt-4 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">ZATCA Settings</h3>
              <div className="space-y-4">
                <Input 
                  label="Seller Name"
                  value={business.zatcaSettings?.sellerName || ''}
                  onChange={e => setBusiness({
                    ...business, 
                    zatcaSettings: {
                      ...business.zatcaSettings,
                      sellerName: e.target.value,
                      vatRegistrationNumber: business.zatcaSettings?.vatRegistrationNumber || '',
                      invoiceSerialNumber: business.zatcaSettings?.invoiceSerialNumber || '',
                      timestamp: business.zatcaSettings?.timestamp || new Date().toISOString(),
                      invoiceTotal: business.zatcaSettings?.invoiceTotal || 0,
                      vatTotal: business.zatcaSettings?.vatTotal || 0
                    }
                  })}
                  placeholder="Enter seller/business name"
                />
                <Input 
                  label="VAT Registration Number"
                  value={business.zatcaSettings?.vatRegistrationNumber || ''}
                  onChange={e => setBusiness({
                    ...business, 
                    zatcaSettings: {
                      ...business.zatcaSettings || {
                        sellerName: '',
                        invoiceSerialNumber: '',
                        timestamp: new Date().toISOString(),
                        invoiceTotal: 0,
                        vatTotal: 0
                      },
                      vatRegistrationNumber: e.target.value
                    }
                  })}
                  placeholder="Enter VAT registration number"
                />
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Note:</p>
                  <p className="text-xs">• Invoice Serial Number will use auto-generated invoice ID</p>
                  <p className="text-xs">• Invoice Total and VAT Total will be calculated automatically from invoice data</p>
                  <p className="text-xs">• Timestamp will use the invoice creation time</p>
                  <p className="text-xs">• These settings are required for ZATCA compliance in Saudi Arabia</p>
                </div>
              </div>
            </div>
          )}
       </div>

       {/* Password Change Section - Only for admin */}
       {userRole === 'admin' && (
         <div className="bg-white p-6 rounded-xl shadow-sm space-y-4 mt-6">
           <div className="flex items-center gap-3 mb-4">
             <Shield className="w-6 h-6 text-indigo-600" />
             <h3 className="text-xl font-bold text-gray-800">Password Management</h3>
           </div>
           
           <div className="space-y-4">
             <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
               <h4 className="font-medium text-blue-800 mb-2">Change Admin Password</h4>
               <p className="text-sm text-blue-700">
                 Change the password for your store admin account. You'll need to enter your current password for security.
               </p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="block text-sm font-medium text-gray-700">
                   Current Password
                 </label>
                 <div className="relative">
                   <input
                     type={showCurrentPassword ? "text" : "password"}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none pr-10"
                     placeholder="Enter current password"
                     id="currentPassword"
                   />
                   <button
                     type="button"
                     onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                     className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                     title={showCurrentPassword ? "Hide password" : "Show password"}
                   >
                     {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                   </button>
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="block text-sm font-medium text-gray-700">
                   New Password
                 </label>
                 <div className="relative">
                   <input
                     type={showNewPassword ? "text" : "password"}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none pr-10"
                     placeholder="Enter new password"
                     id="newPassword"
                   />
                   <button
                     type="button"
                     onClick={() => setShowNewPassword(!showNewPassword)}
                     className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                     title={showNewPassword ? "Hide password" : "Show password"}
                   >
                     {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                   </button>
                 </div>
               </div>
             </div>
             
             <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-700">
                 Confirm New Password
               </label>
               <div className="relative">
                 <input
                   type={showConfirmPassword ? "text" : "password"}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none pr-10"
                   placeholder="Confirm new password"
                   id="confirmPassword"
                 />
                 <button
                   type="button"
                   onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                   className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                   title={showConfirmPassword ? "Hide password" : "Show password"}
                 >
                   {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                 </button>
               </div>
             </div>
             
             <div className="flex gap-3">
               <Button 
                 variant="secondary" 
                 onClick={() => {
                   // Clear password fields
                   const currentPassword = document.getElementById('currentPassword') as HTMLInputElement;
                   const newPassword = document.getElementById('newPassword') as HTMLInputElement;
                   const confirmPassword = document.getElementById('confirmPassword') as HTMLInputElement;
                   
                   if (currentPassword) currentPassword.value = '';
                   if (newPassword) newPassword.value = '';
                   if (confirmPassword) confirmPassword.value = '';
                 }}
                 className="flex-1"
               >
                 Clear
               </Button>
               
               <Button 
                 onClick={async () => {
                   // Double-check user role before proceeding
                   if (userRole !== 'admin') {
                     alert('Only admin users can change passwords');
                     return;
                   }
                   
                   const currentPassword = (document.getElementById('currentPassword') as HTMLInputElement)?.value;
                   const newPassword = (document.getElementById('newPassword') as HTMLInputElement)?.value;
                   const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement)?.value;
                   
                   if (!currentPassword || !newPassword || !confirmPassword) {
                     alert('Please fill in all password fields');
                     return;
                   }
                   
                   if (newPassword !== confirmPassword) {
                     alert('New passwords do not match');
                     return;
                   }
                   
                   if (newPassword.length < 6) {
                     alert('New password must be at least 6 characters long');
                     return;
                   }
                   
                   try {
                     // Get current user
                     const { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } = await import('firebase/auth');
                     const auth = getAuth();
                     const user = auth.currentUser;
                     
                     if (!user || !user.email) {
                       alert('No user logged in');
                       return;
                     }
                     
                     // Additional check: Verify this is actually a store owner/admin
                     // Store owners have their store ID as their user ID
                     // Non-admin users (cashier, salesman, manager) have different user IDs
                     const { dataService } = await import('../../services/firebaseService');
                     
                     // Try to get store user info to verify role
                     try {
                       const storeUser = await dataService.getCurrentStoreUser('temp'); // We'll get actual storeId from user
                       if (storeUser && storeUser.role !== 'admin') {
                         alert('Only store admin users can change passwords');
                         return;
                       }
                     } catch (storeUserError) {
                       console.log('Store user check skipped:', storeUserError);
                       // Continue with password change if we can't verify store user
                     }
                     
                     // Re-authenticate user
                     const credential = EmailAuthProvider.credential(user.email, currentPassword);
                     await reauthenticateWithCredential(user, credential);
                     
                     // Update password
                     await updatePassword(user, newPassword);
                     
                     // Clear fields
                     (document.getElementById('currentPassword') as HTMLInputElement).value = '';
                     (document.getElementById('newPassword') as HTMLInputElement).value = '';
                     (document.getElementById('confirmPassword') as HTMLInputElement).value = '';
                     
                     alert('Password changed successfully!');
                     
                   } catch (error: any) {
                     console.error('Password change error:', error);
                     
                     if (error.code === 'auth/wrong-password') {
                       alert('Current password is incorrect');
                     } else if (error.code === 'auth/weak-password') {
                       alert('New password is too weak. Please use a stronger password');
                     } else if (error.code === 'auth/requires-recent-login') {
                       alert('Session expired. Please log out and log in again to change password');
                     } else if (error.code === 'auth/operation-not-allowed') {
                       alert('Password change is not allowed for this account type');
                     } else {
                       alert(`Error changing password: ${error.message}`);
                     }
                   }
                 }}
                 className="flex-1"
               >
                 Change Password
               </Button>
             </div>
             
             <div className="text-sm text-gray-600 mt-4">
               <p className="font-medium">Password Requirements:</p>
               <ul className="list-disc pl-5 mt-1 space-y-1">
                 <li>Minimum 6 characters</li>
                 <li>Use a combination of letters, numbers, and symbols for better security</li>
                 <li>Do not use easily guessable passwords</li>
               </ul>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

export default SettingsView;
