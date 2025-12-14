import React from 'react';
import { Routes, Route } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import Home from './pages/Home';
import BlogList from './pages/BlogList';
import BlogPost from './pages/BlogPost';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<Home />} />
        <Route path="blog" element={<BlogList />} />
        <Route path="blog/:slug" element={<BlogPost />} />
      </Route>
    </Routes>
  );
};

export default App;