import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Category, UserRole, BusinessSettings } from '../../types';
import { dataService } from '../../services/firebaseService';

const CategoriesView = ({ storeId, t, userRole, business }: { 
  storeId: string,
  t: (key: string) => string,
  userRole: UserRole,
  business: BusinessSettings
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      setIsLoading(true);
      try {
        const categoriesData = await dataService.getCategories(storeId);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();

    // Subscribe to real-time updates
    const unsubscribe = dataService.subscribeToCategories(storeId, (newCategories) => {
      setCategories(newCategories);
    });

    return () => unsubscribe();
  }, [storeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000);
      const categoryId = editingCategory?.id || `category_${timestamp}_${randomSuffix}`;
      
      const category: Category = {
        id: categoryId,
        name: formData.name,
        description: formData.description || '',
        color: formData.color || '#3b82f6', // Default blue color
        storeId
      };

      await dataService.saveCategory(storeId, category);
      
      setIsModalOpen(false);
      setEditingCategory(null);
      setFormData({});
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error saving category. Please try again.');
    }
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData(category);
    setIsModalOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this category? Products in this category will keep the category name but won't be linked to a dynamic category.")) {
      try {
        await dataService.deleteCategory(storeId, id);
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category. Please try again.');
      }
    }
  };

  const getCategoryColor = (color: string = '#3b82f6') => {
    return {
      backgroundColor: `${color}20`, // 20% opacity
      color: color,
      borderColor: `${color}40` // 40% opacity
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
       <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-gray-800">Categories</h2>
         {(userRole === 'admin' || userRole === 'manager') && (
           <Button onClick={() => { setEditingCategory(null); setFormData({}); setIsModalOpen(true); }}>
             <Plus className="w-4 h-4"/> Add Category
           </Button>
         )}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(category => (
            <div 
              key={category.id} 
              className="bg-white rounded-xl shadow-sm p-4 border-l-4" 
              style={{ borderLeftColor: category.color || '#3b82f6' }}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={getCategoryColor(category.color)}
                  >
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    )}
                  </div>
                </div>
                {(userRole === 'admin' || userRole === 'manager') && (
                  <div className="flex gap-1">
                    <button 
                      onClick={() => openEdit(category)}
                      className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      <Edit className="w-4 h-4"/>
                    </button>
                    <button 
                      onClick={() => handleDelete(category.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Used by products</span>
              </div>
            </div>
          ))}
          
          {categories.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Tag className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No categories yet</h3>
              <p className="text-gray-500 mb-6">Create your first category to organize products</p>
              {(userRole === 'admin' || userRole === 'manager') && (
                <Button onClick={() => setIsModalOpen(true)}>
                  <Plus className="w-4 h-4"/> Create First Category
                </Button>
              )}
            </div>
          )}
       </div>

       {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
               <h3 className="text-xl font-bold mb-4">{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
               <form onSubmit={handleSubmit} className="space-y-3">
                  <Input 
                    label="Category Name" 
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    required 
                    placeholder="e.g., Construction, Electrical, Plumbing"
                  />
                  <Input 
                    label="Description (Optional)" 
                    value={formData.description || ''} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    placeholder="Brief description of this category"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color (Optional)
                    </label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={formData.color || '#3b82f6'}
                        onChange={e => setFormData({...formData, color: e.target.value})}
                        className="w-10 h-10 cursor-pointer rounded border border-gray-300"
                      />
                      <span className="text-sm text-gray-600">
                        Used for visual identification
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                     <Button type="button" variant="secondary" onClick={() => {
                       setIsModalOpen(false);
                       setEditingCategory(null);
                       setFormData({});
                     }} className="flex-1">
                       Cancel
                     </Button>
                     <Button type="submit" className="flex-1">
                       {editingCategory ? 'Update' : 'Create'}
                     </Button>
                  </div>
               </form>
            </div>
         </div>
       )}
    </div>
  );
};

export default CategoriesView;
