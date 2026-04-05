import { motion } from 'framer-motion'
import { Users, Plus, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { BatchOperationToolbar } from '@/components/shared/BatchOperationToolbar'
import { ExportButton } from '@/components/shared/ExportButton'
import { useUserManagement } from './useUserManagement'
import { UserFilters } from './UserFilters'
import { UserTable } from './UserTable'
import { UserFormDialogs } from './UserFormDialogs'
import type { User } from './types'

function StatCard({ title, value, icon: Icon, color }: {
  title: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <motion.div whileHover={{ y: -2, scale: 1.01 }} transition={{ type: 'spring', stiffness: 400 }}>
      <Card className="relative overflow-hidden border border-border/50">
        <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${color}`} />
        <CardContent className="relative p-5">
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br shadow-lg ${color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/70 font-medium uppercase tracking-wider">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function UserManagement() {
  const {
    users,
    totalUsers,
    filteredAndSortedUsers,
    filterChips,
    activeUsers,
    inactiveUsers,
    loading,
    error,
    actionLoading,
    currentPage,
    pageSize,
    onPageChange,
    onPageSizeChange,
    searchQuery,
    roleFilter,
    statusFilter,
    hasActiveFilters,
    setSearchQuery,
    setRoleFilter,
    setStatusFilter,
    removeFilterChip,
    clearAllFilters,
    sortField,
    sortOrder,
    toggleSort,
    selectedUserIds,
    toggleUserSelection,
    selectAllUsers,
    deselectAllUsers,
    isAllSelected,
    hasSelection,
    createDialogOpen,
    editDialogOpen,
    deleteDialogOpen,
    batchDeleteDialogOpen,
    resetPasswordConfirmOpen,
    resetPasswordDialogOpen,
    selectedUser,
    setCreateDialogOpen,
    setEditDialogOpen,
    setDeleteDialogOpen,
    setBatchDeleteDialogOpen,
    setResetPasswordConfirmOpen,
    setResetPasswordDialogOpen,
    formData,
    setFormData,
    newPassword,
    copied,
    handleCopyPassword,
    openEditDialog,
    openDeleteDialog,
    openResetPasswordConfirm,
    handleCreate,
    handleEdit,
    handleDelete,
    handleToggleActive,
    handleResetPassword,
    handleBatchActivate,
    handleBatchDeactivate,
    handleBatchDelete,
  } = useUserManagement()

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              用户管理
            </h1>
          </div>
          <p className="text-sm text-muted-foreground/70">管理系统用户、角色和访问权限</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={filteredAndSortedUsers}
            filename="users"
            disabled={filteredAndSortedUsers.length === 0}
          />
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              新建用户
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <StatCard title="总用户" value={users.length} icon={Users} color="from-primary to-primary/60" />
        <StatCard title="已启用" value={activeUsers} icon={CheckCircle2} color="from-emerald-500 to-emerald-400" />
        <StatCard title="已禁用" value={inactiveUsers} icon={XCircle} color="from-slate-500 to-slate-400" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <BatchOperationToolbar
          selectedCount={selectedUserIds.size}
          totalCount={filteredAndSortedUsers.length}
          onSelectAll={selectAllUsers}
          onDeselectAll={deselectAllUsers}
          onActivate={handleBatchActivate}
          onDeactivate={handleBatchDeactivate}
          onDelete={() => setBatchDeleteDialogOpen(true)}
          isAllSelected={isAllSelected}
          hasSelection={hasSelection}
          loading={actionLoading}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="overflow-hidden border border-border/50 shadow-xl shadow-black/5">
          <div className="bg-gradient-to-r from-card via-card to-muted/20">
            <UserFilters
              searchQuery={searchQuery}
              roleFilter={roleFilter}
              statusFilter={statusFilter}
              sortField={sortField}
              sortOrder={sortOrder}
              filterChips={filterChips}
              hasActiveFilters={hasActiveFilters}
              filteredCount={filteredAndSortedUsers.length}
              totalCount={users.length}
              onSearchChange={setSearchQuery}
              onRoleChange={setRoleFilter}
              onStatusChange={setStatusFilter}
              onRemoveChip={removeFilterChip}
              onClearAll={clearAllFilters}
              onToggleSort={toggleSort}
            />
          </div>

          <UserTable
            users={filteredAndSortedUsers}
            loading={loading}
            error={error}
            currentPage={currentPage}
            pageSize={pageSize}
            totalUsers={totalUsers}
            hasActiveFilters={hasActiveFilters}
            onToggleActive={handleToggleActive}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onResetPassword={openResetPasswordConfirm}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            onClearFilters={clearAllFilters}
          />
        </Card>
      </motion.div>

      <UserFormDialogs
        createDialogOpen={createDialogOpen}
        editDialogOpen={editDialogOpen}
        deleteDialogOpen={deleteDialogOpen}
        batchDeleteDialogOpen={batchDeleteDialogOpen}
        resetPasswordConfirmOpen={resetPasswordConfirmOpen}
        resetPasswordDialogOpen={resetPasswordDialogOpen}
        selectedUser={selectedUser}
        formData={formData}
        actionLoading={actionLoading}
        newPassword={newPassword}
        copied={copied}
        selectedUserIds={selectedUserIds}
        onCloseCreate={() => setCreateDialogOpen(false)}
        onCloseEdit={() => setEditDialogOpen(false)}
        onCloseDelete={() => setDeleteDialogOpen(false)}
        onCloseBatchDelete={() => setBatchDeleteDialogOpen(false)}
        onCloseResetPasswordConfirm={() => setResetPasswordConfirmOpen(false)}
        onCloseResetPassword={() => setResetPasswordDialogOpen(false)}
        onFormChange={setFormData}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBatchDelete={handleBatchDelete}
        onResetPassword={handleResetPassword}
        onCopyPassword={handleCopyPassword}
      />
    </div>
  )
}