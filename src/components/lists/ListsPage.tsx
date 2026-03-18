import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Users, AlertCircle, X } from 'lucide-react';
import { getLists, createList, updateList, deleteList, getBounces, removeBounce } from '../../db/database';
import type { List, Bounce } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Table } from '../ui/Table';

interface ListsPageProps {
  onSelectList: (id: number) => void;
}

function formatDate(dt: string) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ListsPage({ onSelectList }: ListsPageProps) {
  const [lists, setLists] = useState<List[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingList, setEditingList] = useState<List | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<List | null>(null);
  const [error, setError] = useState('');
  const [bounces, setBounces] = useState<Bounce[]>([]);
  const [showBounces, setShowBounces] = useState(false);

  const refresh = () => {
    setLists(getLists());
    setBounces(getBounces());
  };

  useEffect(() => { refresh(); }, []);

  const openCreate = () => {
    setEditingList(null);
    setName('');
    setDescription('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (list: List, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingList(list);
    setName(list.name);
    setDescription(list.description);
    setError('');
    setShowModal(true);
  };

  const handleSave = () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (editingList) {
      updateList(editingList.id, name.trim(), description.trim());
    } else {
      createList(name.trim(), description.trim());
    }
    setShowModal(false);
    refresh();
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteList(deleteConfirm.id);
    setDeleteConfirm(null);
    refresh();
  };

  const handleRemoveBounce = (email: string) => {
    removeBounce(email);
    refresh();
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: List) => (
        <span className="font-medium text-gray-900 dark:text-white">{row.name}</span>
      ),
    },
    { key: 'description', header: 'Description', render: (row: List) => <span className="text-gray-500 dark:text-gray-400">{row.description || '—'}</span> },
    {
      key: 'contact_count',
      header: 'Contacts',
      render: (row: List) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
          <Users size={11} />
          {row.contact_count ?? 0}
        </span>
      ),
    },
    { key: 'created_at', header: 'Created', render: (row: List) => <span className="text-gray-500 dark:text-gray-400">{formatDate(row.created_at)}</span> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row: List) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => openEdit(row, e)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(row); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Lists</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{lists.length} list{lists.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} />
          New List
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <Table
          columns={columns}
          data={lists}
          onRowClick={(row) => onSelectList(row.id)}
          emptyMessage="No lists yet. Create your first list to get started."
        />
      </div>

      {/* Bounces section */}
      {bounces.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowBounces((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 hover:text-gray-900 dark:hover:text-white"
          >
            <AlertCircle size={15} className="text-red-400" />
            Bounces ({bounces.length})
            <span className="text-xs font-normal text-gray-400">{showBounces ? '▲ hide' : '▼ show'}</span>
          </button>
          {showBounces && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reason</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {bounces.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium">{b.email}</td>
                      <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-xs truncate max-w-xs">{b.reason}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDate(b.created_at)}</td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => handleRemoveBounce(b.email)}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                          title="Remove bounce"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingList ? 'Edit List' : 'New List'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Newsletter subscribers"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>
              {editingList ? 'Save Changes' : 'Create List'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete List"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This will also delete all contacts in this list. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete List</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
