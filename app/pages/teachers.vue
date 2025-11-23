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
  email: string
}

const data = ref<Student[]>([
  {
    avatar: '',
    name: 'Juan Dela Cruz',
    email: 'juan.delacruz@example.com',
  },
  {
    avatar: '',
    name: 'Maria Santos',
    email: 'maria.santos@example.com',
  },
  {
    avatar: '',
    name: 'Jose Reyes',
    email: 'jose.reyes@example.com',
  },
  {
    avatar: '',
    name: 'Ana Mendoza',
    email: 'ana.mendoza@example.com',
  },
  {
    avatar: '',
    name: 'Pedro Bautista',
    email: 'pedro.bautista@example.com',
  },
  {
    avatar: '',
    name: 'Luisa Flores',
    email: 'luisa.flores@example.com',
  },
  {
    avatar: '',
    name: 'Ramon Villanueva',
    email: 'ramon.villanueva@example.com',
  },
  {
    avatar: '',
    name: 'Carmen Cruz',
    email: 'carmen.cruz@example.com',
  },
  {
    avatar: '',
    name: 'Miguel Ramos',
    email: 'miguel.ramos@example.com',
  },
  {
    avatar: '',
    name: 'Rosa Navarro',
    email: 'rosa.navarro@example.com',
  },
  {
    avatar: '',
    name: 'Andres Santiago',
    email: 'andres.santiago@example.com',
  },
  {
    avatar: '',
    name: 'Elena Ramos',
    email: 'elena.robles@example.com',
  },
  {
    avatar: '',
    name: 'Carlos Domingo',
    email: 'carlos.domingo@example.com',
  },
  {
    avatar: '',
    name: 'Teresa Marquez',
    email: 'teresa.marquez@example.com',
  },
  {
    avatar: '',
    name: 'Ricardo Enriquez',
    email: 'ricardo.enriquez@example.com',
  },
  {
    avatar: '',
    name: 'Sofia Aguirre',
    email: 'sofia.aguirre@example.com',
  },
  {
    avatar: '',
    name: 'Manuel Rivera',
    email: 'manuel.rivera@example.com',
  },
  {
    avatar: '',
    name: 'Beatriz Valdez',
    email: 'beatriz.valdez@example.com',
  },
  {
    avatar: '',
    name: 'Diego Salazar',
    email: 'diego.salazar@example.com',
  },
  {
    avatar: '',
    name: 'Lourdes Pascual',
    email: 'lourdes.pascual@example.com',
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
    accessorKey: 'email',
    header: 'Email'
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
    <UModal :dismissible="false" title="Add New Teacher">

      <UButton label="Add New Teacher" class="mr-5" />

      <template #body>
        <UForm :validate="validate" :state="state" class="space-y-4" @submit="onSubmit">
          <UFormField label="First Name" name="firstname" required  block>
            <UInput placeholder="Juan"  class="w-full" />
          </UFormField>

          <UFormField label="Last Name" name="lastname" required  block>
            <UInput placeholder="Dela Cruz"  class="w-full" />
          </UFormField>
          
          
          <UFormField label="Email Address" name="email" required  block>
            <UInput v-model="state.email" placeholder="user@email.com" class="w-full" />
          </UFormField>

          <UFormField label="Password" name="password" required>
            <UInput v-model="state.password" type="password" placeholder="password" class="w-full"/>
          </UFormField>
          <UFormField label="Sex assigned at birth" name="SAAB" required>
          <USelect placeholder="Select sex" :items="SAAB" class="w-full"/>
          </UFormField>

          <UButton type="submit" block>
            Add Teacher
          </UButton>
          </UForm>
      </template>

    </UModal>

    <UInput :model-value="table?.tableApi?.getColumn('name')?.getFilterValue() as string" class="max-w-sm"
      placeholder="Search student..."
      @update:model-value="table?.tableApi?.getColumn('name')?.setFilterValue($event)" />



    <UTable sticky ref="table" v-model:column-filters="columnFilters" :data="data" :columns="columns"
      class="flex-1 max-h-[70vh]" />

  </UContainer>

</template>