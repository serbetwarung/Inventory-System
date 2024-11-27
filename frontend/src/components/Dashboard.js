import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Dashboard() {
  const [products, setProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Fungsi untuk menentukan warna baris berdasarkan status stok
  const getStockStatusColor = (quantity, minQuantity) => {
    if (quantity <= minQuantity) {
      return 'bg-red-100'; // Merah untuk stok hampir habis
    } else if (quantity <= minQuantity * 2) {
      return 'bg-yellow-100'; // Kuning untuk stok menengah
    }
    return 'bg-green-100'; // Hijau untuk stok aman
  };

  // Fungsi untuk mengurutkan data
  const sortData = (data, key, direction) => {
    const sortedData = [...data];
    sortedData.sort((a, b) => {
      if (key === 'stockStatus') {
        const getStockValue = (item) => {
          if (item.quantity <= item.min_quantity) return 0; // Kritis
          if (item.quantity <= item.min_quantity * 2) return 1; // Menengah
          return 2; // Aman
        };
        return direction === 'ascending' 
          ? getStockValue(a) - getStockValue(b)
          : getStockValue(b) - getStockValue(a);
      }

      if (typeof a[key] === 'string') {
        return direction === 'ascending'
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]);
      }

      return direction === 'ascending' 
        ? a[key] - b[key]
        : b[key] - a[key];
    });
    return sortedData;
  };

  // Fungsi untuk mengubah pengurutan
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Fungsi untuk mendapatkan simbol pengurutan
  const getSortSymbol = (columnName) => {
    if (sortConfig.key !== columnName) return '⇅';
    return sortConfig.direction === 'ascending' ? '↑' : '↓';
  };

  const fetchProducts = async () => {
    try {
      if (!token) {
        navigate('/login');
        return;
      }
      
      const response = await axios.get('http://localhost:5000/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setProducts(response.data);

      const lowStockResponse = await axios.get('http://localhost:5000/api/products/low-stock', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setLowStockProducts(lowStockResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [navigate, token]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        await axios.delete(`http://localhost:5000/api/products/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // Refresh the products list after successful deletion
        fetchProducts();
      } catch (error) {
        console.error('Delete error:', error);
        alert(error.response?.data?.error || 'Failed to delete product');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Filter dan urutkan produk
  const getFilteredAndSortedProducts = () => {
    let result = [...products];
    
    // Filter berdasarkan pencarian
    if (searchTerm) {
      result = result.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Urutkan data
    if (sortConfig.key) {
      result = sortData(result, sortConfig.key, sortConfig.direction);
    }
    
    return result;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between">
            <div className="flex space-x-7">
              <div className="flex items-center py-4">
                <span className="font-semibold text-gray-500 text-lg">Inventory System</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleLogout}
                className="py-2 px-4 text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {lowStockProducts.length > 0 && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Peringatan Stok Rendah
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {lowStockProducts.map(product => (
                      <li key={product.id}>
                        {product.name} (Stok: {product.quantity})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4 flex-1">
            <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Cari nama produk..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/product/add')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Add Product
          </button>
        </div>

        <div className="bg-white shadow-md rounded my-6 overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">No</th>
                <th 
                  className="py-3 px-6 text-left cursor-pointer hover:bg-gray-300"
                  onClick={() => requestSort('name')}
                >
                  Nama {getSortSymbol('name')}
                </th>
                <th 
                  className="py-3 px-6 text-left cursor-pointer hover:bg-gray-300"
                  onClick={() => requestSort('description')}
                >
                  Deskripsi {getSortSymbol('description')}
                </th>
                <th 
                  className="py-3 px-6 text-center cursor-pointer hover:bg-gray-300"
                  onClick={() => requestSort('quantity')}
                >
                  Stok {getSortSymbol('quantity')}
                </th>
                <th 
                  className="py-3 px-6 text-center cursor-pointer hover:bg-gray-300"
                  onClick={() => requestSort('min_quantity')}
                >
                  Stok Min {getSortSymbol('min_quantity')}
                </th>
                <th 
                  className="py-3 px-6 text-center cursor-pointer hover:bg-gray-300"
                  onClick={() => requestSort('stockStatus')}
                >
                  Status {getSortSymbol('stockStatus')}
                </th>
                <th className="py-3 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {getFilteredAndSortedProducts().map((product, index) => (
                <tr 
                  key={product.id} 
                  className={`border-b border-gray-200 hover:bg-opacity-90 ${getStockStatusColor(product.quantity, product.min_quantity)}`}
                >
                  <td className="py-3 px-6 text-left whitespace-nowrap">
                    <span className="font-medium">{index + 1}</span>
                  </td>
                  <td className="py-3 px-6 text-left whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-6 text-left">
                    <span>{product.description}</span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <span>{product.quantity}</span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <span>{product.min_quantity}</span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      product.quantity <= product.min_quantity
                        ? 'bg-red-200 text-red-800'
                        : product.quantity <= product.min_quantity * 2
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-green-200 text-green-800'
                    }`}>
                      {product.quantity <= product.min_quantity
                        ? 'Stok Kritis'
                        : product.quantity <= product.min_quantity * 2
                        ? 'Stok Menengah'
                        : 'Stok Aman'}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex item-center justify-center">
                      <button
                        onClick={() => navigate(`/product/edit/${product.id}`)}
                        className="w-4 mr-2 transform hover:text-purple-500 hover:scale-110"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="w-4 mr-2 transform hover:text-red-500 hover:scale-110"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
