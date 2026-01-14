import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Welcome from './pages/Welcome';
import Hero from './pages/Hero';
import Stores from './pages/Stores';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Tasks from './pages/Tasks';
import AdminPage from './pages/AdminPage';


import { TaskTemplateBuilder } from './pages/admin/TaskTemplateBuilder';
import { TaskTemplateList } from './pages/admin/TaskTemplateList';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
    return (
        <ErrorBoundary>
            <Router>
                <div className="app-container">
                    <Header />
                    <main className="main-content">
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/" element={<Welcome />} />

                            <Route element={<ProtectedRoute />}>
                                <Route path="/home" element={<Hero />} />
                                <Route path="/stores" element={<Stores />} />
                                <Route path="/projects" element={<Projects />} />
                                <Route path="/projects/:id" element={<ProjectDetails />} />
                                <Route path="/tasks" element={<Tasks />} />
                                <Route path="/admin" element={<AdminPage />} />
                                <Route path="/admin/task-templates" element={<TaskTemplateList />} />
                                <Route path="/admin/task-templates/new" element={<TaskTemplateBuilder />} />
                                <Route path="/admin/task-templates/:id" element={<TaskTemplateBuilder />} />
                                <Route path="/admin/roles" element={<Navigate to="/admin" replace />} />
                                <Route path="/admin/workflow" element={<Navigate to="/admin" replace />} />
                            </Route>

                            {/* Fallback */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>
                    <Footer />
                </div>
            </Router>
        </ErrorBoundary>
    );
}

export default App;
