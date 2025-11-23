<script setup lang="ts">

import { h, resolveComponent } from 'vue'
import type { TabsItem } from '@nuxt/ui'
import type { TableColumn } from '@nuxt/ui'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')


definePageMeta({
  layout: 'dashboard',
})

const items = [
  {
    label: 'People',
    description: 'Make changes to your account here. Click save when you\'re done.',
    icon: 'i-lucide-users',
    slot: 'people' as const
  },
  {
    label: 'Assessments',
    description: 'Change your password here. After saving, you\'ll be logged out.',
    icon: 'i-lucide-text-search',
    slot: 'assessment' as const
  },
  {
    label: 'Journals',
    description: 'Make changes to your account here. Click save when you\'re done.',
    icon: 'i-lucide-notebook-pen',
    slot: 'journals' as const
  },
] satisfies TabsItem[]


// PEOPLE TAB SCRIPT

type Student = {
  avatar: string
  name: string
  id: string
  email: string
}

const data = ref<Student[]>([
  {
    avatar: '',
    name: 'Juan Dela Cruz',
    id: '4600',
    email: 'juan.delacruz@example.com',
  },
  {
    avatar: '',
    name: 'Maria Santos',
    id: '4601',
    email: 'maria.santos@example.com',
  },
  {
    avatar: '',
    name: 'Jose Reyes',
    id: '4602',
    email: 'jose.reyes@example.com',
  },
  {
    avatar: '',
    name: 'Ana Mendoza',
    id: '4603',
    email: 'ana.mendoza@example.com',
  },
  {
    avatar: '',
    name: 'Pedro Bautista',
    id: '4604',
    email: 'pedro.bautista@example.com',
  },
  {
    avatar: '',
    name: 'Luisa Flores',
    id: '4605',
    email: 'luisa.flores@example.com',
  },
  {
    avatar: '',
    name: 'Ramon Villanueva',
    id: '4606',
    email: 'ramon.villanueva@example.com',
  },
  {
    avatar: '',
    name: 'Carmen Cruz',
    id: '4607',
    email: 'carmen.cruz@example.com',
  },
  {
    avatar: '',
    name: 'Miguel Ramos',
    id: '4608',
    email: 'miguel.ramos@example.com',
  },
  {
    avatar: '',
    name: 'Rosa Navarro',
    id: '4609',
    email: 'rosa.navarro@example.com',
  },
  {
    avatar: '',
    name: 'Andres Santiago',
    id: '4610',
    email: 'andres.santiago@example.com',
  },
  {
    avatar: '',
    name: 'Elena Ramos',
    id: '4611',
    email: 'elena.robles@example.com',
  },
  {
    avatar: '',
    name: 'Carlos Domingo',
    id: '4612',
    email: 'carlos.domingo@example.com',
  },
  {
    avatar: '',
    name: 'Teresa Marquez',
    id: '4613',
    email: 'teresa.marquez@example.com',
  },
  {
    avatar: '',
    name: 'Ricardo Enriquez',
    id: '4614',
    email: 'ricardo.enriquez@example.com',
  },
  {
    avatar: '',
    name: 'Sofia Aguirre',
    id: '4615',
    email: 'sofia.aguirre@example.com',
  },
  {
    avatar: '',
    name: 'Manuel Rivera',
    id: '4616',
    email: 'manuel.rivera@example.com',
  },
  {
    avatar: '',
    name: 'Beatriz Valdez',
    id: '4617',
    email: 'beatriz.valdez@example.com',
  },
  {
    avatar: '',
    name: 'Diego Salazar',
    id: '4618',
    email: 'diego.salazar@example.com',
  },
  {
    avatar: '',
    name: 'Lourdes Pascual',
    id: '4619',
    email: 'lourdes.pascual@example.com',
  },
])

const columns: TableColumn<Student>[] = [
  {
    accessorKey: 'avatar',
    header: ''
  },
  {
    accessorKey: 'name',
    header: ' '
  },
  {
    accessorKey: 'id',
    header: ' ',
    cell: ({ row }) => `#${row.getValue('id')}`
  },
  {
    accessorKey: 'email',
    header: ' '
  },
]

type Teacher = {
  name: string,
}

const teachers = ref<Teacher[]>([
  {
    name: 'Juan Dela Cruz',
  }, {
    name: 'Juan Dela Cruz',
  }


])

const teacher_columns: TableColumn<Teacher>[] = [
  {
    accessorKey: 'name',
    header: ' '
  },

]

const table = useTemplateRef('table')

// END PEOPLE TAB SCRIPT

// START ASSESSMENT TAB SCRIPT

type Payment = {
  id: string
  date: string
}

const classassessmentdata = ref<Payment[]>([
  {
    id: 'Class-wide Assessment 1',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Class-wide Assessment 2',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Class-wide Assessment 3',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Class-wide Assessment 4',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Class-wide Assessment 5',
    date: 'Due Oct 10, 2026, 20:15',
  },
])

const indiassessmentdata = ref<Payment[]>([
  {
    id: 'Individual Assessment 1',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Individual Assessment 2',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Individual Assessment 3',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Individual Assessment 4',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Individual Assessment 5',
    date: 'Due Oct 10, 2026, 20:15',
  },
])

const assessmentcolumns: TableColumn<Payment>[] = [
  {
    accessorKey: 'id',
    header: '',
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    id: 'expand',
    cell: ({ row }) =>
      h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-chevron-down',
        square: true,
        'aria-label': 'Expand',
        ui: {
          leadingIcon: [
            'transition-transform',
            row.getIsExpanded() ? 'duration-200 rotate-180' : ''
          ]
        },
        onClick: () => row.toggleExpanded()
      })
  },
]

const expanded = ref({ 1: true })

// END ASSESSMENTS TAB SCRIPT
</script>

<template>
  <UContainer>
    <UPageCard class="h-40">
      <UPageHeader title="Grade 7 Section A" style="border-bottom: 0; margin-top: auto; padding-bottom: 0;" />
    </UPageCard>

    <UPageCard class="mt-6">
      <UTabs :items="items" variant="link" :ui="{ trigger: 'grow' }" class="gap-4 w-full">

        <!-- PEOPLE TAB -->
        <template #people="{ item }">
          <UPageGrid class="mt-5">
            <UContainer class="lg:col-span-2">
              <div class="text-lg font-bold" style="">Students</div>
              <UTable sticky ref="table" :data="data" :columns="columns" :ui="{ thead: 'hidden' }" />
            </UContainer>
            <UContainer>
              <div class="text-xl font-bold">Teachers</div>
              <UTable :data="teachers" ref="table" :columns="teacher_columns" :ui="{ thead: 'hidden' }" />
            </UContainer>
          </UPageGrid>



        </template>
        <!-- ASSESSMENTS TAB -->
        <template #assessment="{ item }">
          <UContainer class="mt-5">
            <div class="text-lg font-bold" style="">Class-wide Assessments</div>

            <UTable v-model:expanded="expanded" :data="classassessmentdata" :columns="assessmentcolumns"
              :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }" class="flex-1">
              <template #expanded="{ row }">
                <pre>Insert assessment description here</pre>
              </template>
            </UTable>
          </UContainer>

          <UContainer class="mt-5">
            <div class="text-lg font-bold" style="">Individual Assessments</div>

            <UTable v-model:expanded="expanded" :data="indiassessmentdata" :columns="assessmentcolumns"
              :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }" class="flex-1">
              <template #expanded="{ row }">
                <pre>Insert assessment description here</pre>
              </template>
            </UTable>
          </UContainer>

        </template>
      </UTabs>
    </UPageCard>

  </UContainer>
</template>
