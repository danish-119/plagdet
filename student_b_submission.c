/**
 * Student B - Store Management System
 * A program to manage store items using dynamic data structures,
 * sales processing, and report generation.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define NAME_MAX_LEN 64
#define ITEM_MAX 100
#define SALES_TAX 0.08
#define LOW_STOCK_LEVEL 10
#define VOLUME_PRICE_LIMIT 50

typedef enum item_category {
    ELECTRONICS = 1,
    APPAREL,
    GROCERY,
    LITERATURE,
    MISCELLANEOUS
} item_category;

typedef struct store_item {
    int item_code;
    char item_name[NAME_MAX_LEN];
    item_category cat;
    double selling_price;
    int stock_count;
    int sold_count;
    struct store_item *next_ptr;
} store_item;

typedef struct store {
    store_item *first_item;
    int item_total;
    double earnings;
} store;

static const char *cat_names[] = {
    "Unknown", "Electronics", "Apparel", "Grocery", "Literature", "Miscellaneous"
};

static store_item *make_item(int code, const char *title, item_category cat,
                              double cost, int qty) {
    store_item *fresh = (store_item *)malloc(sizeof(store_item));
    if (fresh == NULL) {
        fprintf(stderr, "Allocation error for item %d\n", code);
        return NULL;
    }
    fresh->item_code = code;
    strncpy(fresh->item_name, title, NAME_MAX_LEN - 1);
    fresh->item_name[NAME_MAX_LEN - 1] = '\0';
    fresh->cat = cat;
    fresh->selling_price = cost;
    fresh->stock_count = qty;
    fresh->sold_count = 0;
    fresh->next_ptr = NULL;
    return fresh;
}

static void add_item_to_store(store *s, store_item *it) {
    if (s->first_item == NULL) {
        s->first_item = it;
    } else {
        store_item *ptr = s->first_item;
        while (ptr->next_ptr != NULL) {
            ptr = ptr->next_ptr;
        }
        ptr->next_ptr = it;
    }
    s->item_total++;
}

static store_item *search_item(const store *s, int target_code) {
    store_item *ptr = s->first_item;
    while (ptr != NULL) {
        if (ptr->item_code == target_code) {
            return ptr;
        }
        ptr = ptr->next_ptr;
    }
    return NULL;
}

static int delete_item_from_store(store *s, int target_code) {
    if (s->first_item == NULL) return -1;
    
    store_item *curr = s->first_item;
    store_item *prev = NULL;
    
    while (curr != NULL) {
        if (curr->item_code == target_code) {
            if (prev == NULL) {
                s->first_item = curr->next_ptr;
            } else {
                prev->next_ptr = curr->next_ptr;
            }
            free(curr);
            s->item_total--;
            return 0;
        }
        prev = curr;
        curr = curr->next_ptr;
    }
    return -1;
}

static int count_low_stock(const store *s, int limit) {
    int tally = 0;
    store_item *ptr = s->first_item;
    while (ptr != NULL) {
        if (ptr->stock_count < limit) {
            tally++;
        }
        ptr = ptr->next_ptr;
    }
    return tally;
}

static double calc_total_value(const store *s) {
    double sum = 0.0;
    store_item *ptr = s->first_item;
    while (ptr != NULL) {
        sum += ptr->selling_price * ptr->stock_count;
        ptr = ptr->next_ptr;
    }
    return sum;
}

static void process_sale(store *s, int item_code, int amount) {
    store_item *target = search_item(s, item_code);
    if (target == NULL) {
        printf("Item code %d not located in store.\n", item_code);
        return;
    }
    if (target->stock_count < amount) {
        printf("Not enough stock for %s. Have: %d, Need: %d\n",
               target->item_name, target->stock_count, amount);
        return;
    }
    target->stock_count -= amount;
    target->sold_count += amount;
    double revenue = target->selling_price * amount;
    s->earnings += revenue;
    printf("Purchase: %d x %s @ $%.2f each = $%.2f\n",
           amount, target->item_name, target->selling_price, revenue);
}

static void arrange_by_price(store_item **head) {
    if (*head == NULL || (*head)->next_ptr == NULL) return;
    
    store_item *ordered = NULL;
    store_item *remaining = *head;
    
    while (remaining != NULL) {
        store_item *next_remaining = remaining->next_ptr;
        if (ordered == NULL || remaining->selling_price <= ordered->selling_price) {
            remaining->next_ptr = ordered;
            ordered = remaining;
        } else {
            store_item *cursor = ordered;
            while (cursor->next_ptr != NULL && cursor->next_ptr->selling_price < remaining->selling_price) {
                cursor = cursor->next_ptr;
            }
            remaining->next_ptr = cursor->next_ptr;
            cursor->next_ptr = remaining;
        }
        remaining = next_remaining;
    }
    *head = ordered;
}

static void show_summary(const store *s) {
    printf("\n========== STORE OVERVIEW ==========\n");
    printf("Total Items: %d\n", s->item_total);
    printf("Stock Value: $%.2f\n", calc_total_value(s));
    printf("Total Earnings: $%.2f\n", s->earnings);
    printf("Low Stock Items (<%d): %d\n", LOW_STOCK_LEVEL,
           count_low_stock(s, LOW_STOCK_LEVEL));
    printf("=====================================\n\n");
}

static void list_all_items(const store *s) {
    printf("\n%-6s %-20s %-14s %-10s %-8s %-8s\n",
           "Code", "Name", "Category", "Price", "Stock", "Sold");
    printf("------ -------------------- -------------- ---------- -------- --------\n");
    store_item *ptr = s->first_item;
    while (ptr != NULL) {
        printf("%-6d %-20s %-14s $%-9.2f %-8d %-8d\n",
               ptr->item_code, ptr->item_name,
               cat_names[ptr->cat], ptr->selling_price,
               ptr->stock_count, ptr->sold_count);
        ptr = ptr->next_ptr;
    }
    printf("\n");
}

int main(void) {
    store shop = {NULL, 0, 0.0};
    
    add_item_to_store(&shop, make_item(101, "Laptop Pro X", ELECTRONICS, 1299.99, 15));
    add_item_to_store(&shop, make_item(102, "Wireless Mouse", ELECTRONICS, 29.99, 50));
    add_item_to_store(&shop, make_item(103, "USB-C Hub", ELECTRONICS, 49.99, 30));
    add_item_to_store(&shop, make_item(201, "Winter Jacket", APPAREL, 89.99, 25));
    add_item_to_store(&shop, make_item(202, "Running Shoes", APPAREL, 119.99, 20));
    add_item_to_store(&shop, make_item(301, "Organic Pasta", GROCERY, 4.99, 100));
    add_item_to_store(&shop, make_item(302, "Dark Chocolate", GROCERY, 3.49, 75));
    add_item_to_store(&shop, make_item(401, "C Programming Guide", LITERATURE, 54.99, 12));
    add_item_to_store(&shop, make_item(402, "Data Structures 101", LITERATURE, 64.99, 8));
    add_item_to_store(&shop, make_item(501, "Desk Lamp LED", MISCELLANEOUS, 34.99, 40));
    
    show_summary(&shop);
    list_all_items(&shop);
    
    process_sale(&shop, 101, 2);
    process_sale(&shop, 301, 20);
    process_sale(&shop, 401, 3);
    process_sale(&shop, 201, 1);
    process_sale(&shop, 302, 15);
    process_sale(&shop, 102, 5);
    
    printf("\n--- After Processing Sales ---\n");
    show_summary(&shop);
    
    arrange_by_price(&shop.first_item);
    printf("\n--- Items Ordered by Price ---\n");
    list_all_items(&shop);
    
    printf("\nDeleting item 501 (Desk Lamp LED)...\n");
    delete_item_from_store(&shop, 501);
    show_summary(&shop);
    
    int low = count_low_stock(&shop, LOW_STOCK_LEVEL);
    printf("Items with stock under %d: %d\n", LOW_STOCK_LEVEL, low);
    
    printf("\nProgram finished.\n");
    return 0;
}