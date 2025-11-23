<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const UBadge = resolveComponent('UBadge')

type Student = {
  avatar: string
  name: string
  id: string
  email: string
  section: string
  status: 'paid' | 'failed' | 'refunded'
}

const data = ref<Student[]>([
  {
    avatar: '',
    name: 'Juan Dela Cruz',
    id: '4600',
    email: 'juan.delacruz@example.com',
    section: 'A1',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Maria Santos',
    id: '4601',
    email: 'maria.santos@example.com',
    section: 'A2',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Jose Reyes',
    id: '4602',
    email: 'jose.reyes@example.com',
    section: 'A3',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Ana Mendoza',
    id: '4603',
    email: 'ana.mendoza@example.com',
    section: 'A4',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Pedro Bautista',
    id: '4604',
    email: 'pedro.bautista@example.com',
    section: 'A5',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Luisa Flores',
    id: '4605',
    email: 'luisa.flores@example.com',
    section: 'A6',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Ramon Villanueva',
    id: '4606',
    email: 'ramon.villanueva@example.com',
    section: 'A7',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Carmen Cruz',
    id: '4607',
    email: 'carmen.cruz@example.com',
    section: 'A8',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Miguel Ramos',
    id: '4608',
    email: 'miguel.ramos@example.com',
    section: 'A9',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Rosa Navarro',
    id: '4609',
    email: 'rosa.navarro@example.com',
    section: 'A10',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Andres Santiago',
    id: '4610',
    email: 'andres.santiago@example.com',
    section: 'A11',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Elena Ramos',
    id: '4611',
    email: 'elena.robles@example.com',
    section: 'A12',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Carlos Domingo',
    id: '4612',
    email: 'carlos.domingo@example.com',
    section: 'A13',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Teresa Marquez',
    id: '4613',
    email: 'teresa.marquez@example.com',
    section: 'A14',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Ricardo Enriquez',
    id: '4614',
    email: 'ricardo.enriquez@example.com',
    section: 'A15',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Sofia Aguirre',
    id: '4615',
    email: 'sofia.aguirre@example.com',
    section: 'A16',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Manuel Rivera',
    id: '4616',
    email: 'manuel.rivera@example.com',
    section: 'A17',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Beatriz Valdez',
    id: '4617',
    email: 'beatriz.valdez@example.com',
    section: 'A18',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Diego Salazar',
    id: '4618',
    email: 'diego.salazar@example.com',
    section: 'A19',
    status: 'paid',
  },
  {
    avatar: '',
    name: 'Lourdes Pascual',
    id: '4619',
    email: 'lourdes.pascual@example.com',
    section: 'A20',
    status: 'paid',
  }
])

const columns: TableColumn<Student>[] = [
  {
    accessorKey: 'avatar',
    header: ''
  },
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'id',
    header: 'Student #',
    cell: ({ row }) => `#${row.getValue('id')}`
  },
  {
    accessorKey: 'email',
    header: 'Email'
  },
  {
    accessorKey: 'section',
    header: 'Section'
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const color = {
        paid: 'success' as const,
        failed: 'error' as const,
        refunded: 'neutral' as const
      }[row.getValue('status') as string]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
        row.getValue('status')
      )
    }
  },
]

const table = useTemplateRef('table')

const columnFilters = ref([
  {
    id: 'name',
    value: ''
  }
])
</script>

<template>
  <UContainer>
    

      <UInput :model-value="table?.tableApi?.getColumn('name')?.getFilterValue() as string"
        class="max-w-sm" placeholder="Search student..."
        @update:model-value="table?.tableApi?.getColumn('name')?.setFilterValue($event)" />


    <UTable sticky ref="table" v-model:column-filters="columnFilters" :data="data" :columns="columns"
      class="flex-1 max-h-[70vh]" />

  </UContainer>

</template>
