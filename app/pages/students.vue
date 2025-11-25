<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
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
  proficiency: 'beginner' | 'expert' | 'intermediate'
}

const data = ref<Student[]>([
  {
    avatar: '',
    name: 'Juan Dela Cruz',
    id: '4600',
    email: 'juan.delacruz@example.com',
    section: 'A1',
    proficiency: 'beginner',
  },
  {
    avatar: '',
    name: 'Maria Santos',
    id: '4601',
    email: 'maria.santos@example.com',
    section: 'A2',
    proficiency: 'intermediate',
  },
  {
    avatar: '',
    name: 'Jose Reyes',
    id: '4602',
    email: 'jose.reyes@example.com',
    section: 'A3',
    proficiency: 'expert',
  },
  {
    avatar: '',
    name: 'Ana Mendoza',
    id: '4603',
    email: 'ana.mendoza@example.com',
    section: 'A4',
    proficiency: 'beginner',
  },
  {
    avatar: '',
    name: 'Pedro Bautista',
    id: '4604',
    email: 'pedro.bautista@example.com',
    section: 'A5',
    proficiency: 'intermediate',
  },
  {
    avatar: '',
    name: 'Luisa Flores',
    id: '4605',
    email: 'luisa.flores@example.com',
    section: 'A6',
    proficiency: 'expert',
  },
  {
    avatar: '',
    name: 'Ramon Villanueva',
    id: '4606',
    email: 'ramon.villanueva@example.com',
    section: 'A7',
    proficiency: 'beginner',
  },
  {
    avatar: '',
    name: 'Carmen Cruz',
    id: '4607',
    email: 'carmen.cruz@example.com',
    section: 'A8',
    proficiency: 'beginner',
  },
  {
    avatar: '',
    name: 'Miguel Ramos',
    id: '4608',
    email: 'miguel.ramos@example.com',
    section: 'A9',
    proficiency: 'intermediate',
  },
  {
    avatar: '',
    name: 'Rosa Navarro',
    id: '4609',
    email: 'rosa.navarro@example.com',
    section: 'A10',
    proficiency: 'beginner',
  },
  {
    avatar: '',
    name: 'Andres Santiago',
    id: '4610',
    email: 'andres.santiago@example.com',
    section: 'A11',
    proficiency: 'expert',
  },
  {
    avatar: '',
    name: 'Elena Ramos',
    id: '4611',
    email: 'elena.robles@example.com',
    section: 'A12',
    proficiency: 'beginner',
  },
  {
    avatar: '',
    name: 'Carlos Domingo',
    id: '4612',
    email: 'carlos.domingo@example.com',
    section: 'A13',
    proficiency: 'beginner',
  },
  {
    avatar: '',
    name: 'Teresa Marquez',
    id: '4613',
    email: 'teresa.marquez@example.com',
    section: 'A14',
    proficiency: 'beginner',
  },
  {
    avatar: '',
    name: 'Ricardo Enriquez',
    id: '4614',
    email: 'ricardo.enriquez@example.com',
    section: 'A15',
    proficiency: 'beginner',
  },
  {
    avatar: '',
    name: 'Sofia Aguirre',
    id: '4615',
    email: 'sofia.aguirre@example.com',
    section: 'A16',
    proficiency: 'beginner',
  },
  {
    avatar: '',
    name: 'Manuel Rivera',
    id: '4616',
    email: 'manuel.rivera@example.com',
    section: 'A17',
    proficiency: 'expert',
  },
  {
    avatar: '',
    name: 'Beatriz Valdez',
    id: '4617',
    email: 'beatriz.valdez@example.com',
    section: 'A18',
    proficiency: 'beginner',
  },
  {
    avatar: '',
    name: 'Diego Salazar',
    id: '4618',
    email: 'diego.salazar@example.com',
    section: 'A19',
    proficiency: 'beginner',
  },
  {
    avatar: '',
    name: 'Lourdes Pascual',
    id: '4619',
    email: 'lourdes.pascual@example.com',
    section: 'A20',
    proficiency: 'beginner',
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
    accessorKey: 'proficiency',
    header: 'Proficiency',
    cell: ({ row }) => {
      const color = {
        beginner: 'success' as const,
        expert: 'error' as const,
        intermediate: 'neutral' as const
      }[row.getValue('proficiency') as string]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
        row.getValue('proficiency')
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

// FORM SCRIPT 

const state = reactive({
  email: undefined,
  password: undefined
})

type Schema = typeof state

function validate(state: Partial<Schema>): FormError[] {
  const errors = []
  if (!state.email) errors.push({ name: 'email', message: 'Required' })
  if (!state.password) errors.push({ name: 'password', message: 'Required' })
  return errors
}

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({ title: 'Success', description: 'The form has been submitted.', color: 'success' })
  console.log(event.data)
}

const SAAB = ref(['Male', 'Female'])

// END FORM SCRIPT
</script>

<template>
  <UContainer>
    <UPageCard>

      <div class="flex">
        <div class="text-lg font-bold">Students</div>
        <div style="margin-left: auto">
          <UInput :model-value="table?.tableApi?.getColumn('name')?.getFilterValue() as string" class="max-w-sm mr-5"
            placeholder="Search students..."
            @update:model-value="table?.tableApi?.getColumn('name')?.setFilterValue($event)" />

          <UModal :dismissible="false" title="Add New Student">

            <UButton label="Add New Student" />

            <template #body>
              <UForm :validate="validate" :state="state" class="space-y-4" @submit="onSubmit">
                <UFormField label="First Name" name="firstname" required block>
                  <UInput placeholder="Juan" class="w-full" />
                </UFormField>

                <UFormField label="Last Name" name="lastname" required block>
                  <UInput placeholder="Dela Cruz" class="w-full" />
                </UFormField>


                <UFormField label="Email Address" name="email" required block>
                  <UInput v-model="state.email" placeholder="user@email.com" class="w-full" />
                </UFormField>

                <UFormField label="Password" name="password" required>
                  <UInput v-model="state.password" type="password" placeholder="password" class="w-full" />
                </UFormField>
                <UFormField label="Sex assigned at birth" name="SAAB" required>
                  <USelect placeholder="Select sex" :items="SAAB" class="w-full" />
                </UFormField>

                <UButton type="submit" block>
                  Add Student
                </UButton>
              </UForm>
            </template>

          </UModal>

        </div>
      </div>


      <UTable sticky ref="table" v-model:column-filters="columnFilters" :data="data" :columns="columns"
        class="flex-1 max-h-[70vh]" />
    </UPageCard>
  </UContainer>

</template>
