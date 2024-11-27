import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import ProductForm from './components/ProductForm';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/product/add" element={<ProductForm />} />
        <Route path="/product/edit/:id" element={<ProductForm />} />
      </Routes>
    </div>
  );
}

export default App;
