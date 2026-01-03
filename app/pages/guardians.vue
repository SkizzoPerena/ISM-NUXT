<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const { data, status } = await useAsyncData('guardians',
  () => $fetch<Guardian[]>('https://noteworthy-z9k0.onrender.com/api/admin/guardian', {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      // This will log the raw response body.
      // Check your browser's developer console to see the structure of the data.
      console.log('API Response:', response._data)
    }
  }),
  {
    transform: (response: any) => {
      // The API might return data inside a property, e.g., { "data": [...] }
      // This line tries to find the array, assuming it might be nested.
      const guardianData = response?.data || response?.guardians || response
      const rows = Array.isArray(guardianData) ? guardianData : []
      return rows.map((guardian: any) => ({
        _id: guardian._id,
        email: guardian.email,
        name: guardian.firstName + ' ' + guardian.lastName,
        gender: guardian.gender,
        profileImageURL: guardian.profileImageURL,
      }))
    },
    lazy: false,
  }
)


type Guardian = {
  _id: string
  email: string
  name: string
  gender: string
  profileImageURL: string
}

const UAvatar = resolveComponent('UAvatar')

const columns: TableColumn<Guardian>[] = [
  {
    accessorKey: 'profileImageURL',
    header: '',
    // Using `resolveComponent` with a string name can be unreliable during SSR hydration.
    // It's much safer to reference the auto-imported component constructor `UAvatar` directly.
    cell: ({ row }) => h(UAvatar, { src: row.original.profileImageURL, alt: row.original.name })
  },
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: '_id',
    header: 'Guardian #',
    cell: ({ row }) => `#${row.getValue('_id')}`
  },
  {
    accessorKey: 'email',
    header: 'Email'
  },
  {
    accessorKey: 'gender',
    header: 'Gender'
  },
]

// TABLE FILTER SCRIPT

const table = useTemplateRef('table')

const columnFilters = ref([
  {
    id: 'name',
    value: ''
  }
])

// END TABLE FILTER SCRIPT

// FORM SCRIPT 



// END FORM SCRIPT
</script>

<template>
  <UContainer>
    <UPageCard>

      <div class="flex items-center gap-4 mb-4">
        <div class="text-lg font-bold">guardians</div>
        <div style="margin-left: auto">
          <UInput :model-value="table?.tableApi?.getColumn('name')?.getFilterValue() as string" class="max-w-sm mr-5"
            placeholder="Search guardians..."
            @update:model-value="table?.tableApi?.getColumn('name')?.setFilterValue($event)" />
        </div>
      </div>


      <!--
        The UTable with `sticky` and viewport-dependent height (`max-h-[70vh]`) can cause a hydration mismatch.
        The server doesn't have a viewport, so it renders the HTML differently than the client.
        Wrapping the component in <ClientOnly> ensures it only renders in the browser, avoiding the error.
      -->
      <ClientOnly>
        <UTable ref="table" v-model:column-filters="columnFilters" sticky :data="data || []" :columns="columns" :loading="status === 'pending'" class="flex-1 max-h-[70vh]" />
      </ClientOnly>
    </UPageCard>
  </UContainer>

</template>
