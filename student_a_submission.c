/**
 * Student A - Data Structures Assignment
 * Implementation of a simple inventory management system
 * using linked lists, sorting, and file I/O.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define MAX_NAME_LENGTH 64
#define MAX_PRODUCTS 100
#define TAX_RATE 0.08
#define DISCOUNT_THRESHOLD 10
#define BULK_PRICE_CUTOFF 50

typedef enum category {
    CAT_ELECTRONICS = 1,
    CAT_CLOTHING,
    CAT_FOOD,
    CAT_BOOKS,
    CAT_OTHER
} category_t;

typedef struct product {
    int product_id;
    char product_name[MAX_NAME_LENGTH];
    category_t category;
    double unit_price;
    int quantity_in_stock;
    int units_sold;
    struct product *next_item;
} product_t;

typedef struct inventory {
    product_t *head_product;
    int total_products;
    double total_revenue;
} inventory_t;

static const char *category_labels[] = {
    "Unknown", "Electronics", "Clothing", "Food", "Books", "Other"
};

static product_t *create_product(int id, const char *name, category_t cat,
                                  double price, int stock) {
    product_t *new_product = (product_t *)malloc(sizeof(product_t));
    if (new_product == NULL) {
        fprintf(stderr, "Memory allocation failed for product %d\n", id);
        return NULL;
    }
    new_product->product_id = id;
    strncpy(new_product->product_name, name, MAX_NAME_LENGTH - 1);
    new_product->product_name[MAX_NAME_LENGTH - 1] = '\0';
    new_product->category = cat;
    new_product->unit_price = price;
    new_product->quantity_in_stock = stock;
    new_product->units_sold = 0;
    new_product->next_item = NULL;
    return new_product;
}

static void insert_product(inventory_t *inv, product_t *prod) {
    if (inv->head_product == NULL) {
        inv->head_product = prod;
    } else {
        product_t *current = inv->head_product;
        while (current->next_item != NULL) {
            current = current->next_item;
        }
        current->next_item = prod;
    }
    inv->total_products++;
}

static product_t *find_product_by_id(const inventory_t *inv, int target_id) {
    product_t *cursor = inv->head_product;
    while (cursor != NULL) {
        if (cursor->product_id == target_id) {
            return cursor;
        }
        cursor = cursor->next_item;
    }
    return NULL;
}

static int remove_product_by_id(inventory_t *inv, int target_id) {
    if (inv->head_product == NULL) return -1;
    
    product_t *current_node = inv->head_product;
    product_t *previous_node = NULL;
    
    while (current_node != NULL) {
        if (current_node->product_id == target_id) {
            if (previous_node == NULL) {
                inv->head_product = current_node->next_item;
            } else {
                previous_node->next_item = current_node->next_item;
            }
            free(current_node);
            inv->total_products--;
            return 0;
        }
        previous_node = current_node;
        current_node = current_node->next_item;
    }
    return -1;
}

static int count_low_stock_items(const inventory_t *inv, int threshold) {
    int low_stock_counter = 0;
    product_t *walker = inv->head_product;
    while (walker != NULL) {
        if (walker->quantity_in_stock < threshold) {
            low_stock_counter++;
        }
        walker = walker->next_item;
    }
    return low_stock_counter;
}

static double compute_inventory_value(const inventory_t *inv) {
    double total_value = 0.0;
    product_t *item = inv->head_product;
    while (item != NULL) {
        total_value += item->unit_price * item->quantity_in_stock;
        item = item->next_item;
    }
    return total_value;
}

static void record_sale(inventory_t *inv, int product_id, int quantity) {
    product_t *prod = find_product_by_id(inv, product_id);
    if (prod == NULL) {
        printf("Product ID %d not found in inventory.\n", product_id);
        return;
    }
    if (prod->quantity_in_stock < quantity) {
        printf("Insufficient stock for product %s. Available: %d, Requested: %d\n",
               prod->product_name, prod->quantity_in_stock, quantity);
        return;
    }
    prod->quantity_in_stock -= quantity;
    prod->units_sold += quantity;
    double sale_amount = prod->unit_price * quantity;
    inv->total_revenue += sale_amount;
    printf("Sale recorded: %d x %s @ $%.2f = $%.2f\n",
           quantity, prod->product_name, prod->unit_price, sale_amount);
}

static void sort_products_by_price(product_t **head_ref) {
    if (*head_ref == NULL || (*head_ref)->next_item == NULL) return;
    
    product_t *sorted_list = NULL;
    product_t *current_unsorted = *head_ref;
    
    while (current_unsorted != NULL) {
        product_t *next_unsorted = current_unsorted->next_item;
        if (sorted_list == NULL || current_unsorted->unit_price <= sorted_list->unit_price) {
            current_unsorted->next_item = sorted_list;
            sorted_list = current_unsorted;
        } else {
            product_t *scan = sorted_list;
            while (scan->next_item != NULL && scan->next_item->unit_price < current_unsorted->unit_price) {
                scan = scan->next_item;
            }
            current_unsorted->next_item = scan->next_item;
            scan->next_item = current_unsorted;
        }
        current_unsorted = next_unsorted;
    }
    *head_ref = sorted_list;
}

static void display_inventory_summary(const inventory_t *inv) {
    printf("\n========== INVENTORY SUMMARY ==========\n");
    printf("Total Products: %d\n", inv->total_products);
    printf("Total Inventory Value: $%.2f\n", compute_inventory_value(inv));
    printf("Total Revenue: $%.2f\n", inv->total_revenue);
    printf("Low Stock Items (<%d): %d\n", DISCOUNT_THRESHOLD,
           count_low_stock_items(inv, DISCOUNT_THRESHOLD));
    printf("========================================\n\n");
}

static void print_all_products(const inventory_t *inv) {
    printf("\n%-6s %-20s %-14s %-10s %-8s %-8s\n",
           "ID", "Name", "Category", "Price", "Stock", "Sold");
    printf("------ -------------------- -------------- ---------- -------- --------\n");
    product_t *p = inv->head_product;
    while (p != NULL) {
        printf("%-6d %-20s %-14s $%-9.2f %-8d %-8d\n",
               p->product_id, p->product_name,
               category_labels[p->category], p->unit_price,
               p->quantity_in_stock, p->units_sold);
        p = p->next_item;
    }
    printf("\n");
}

static void save_inventory_to_file(const inventory_t *inv, const char *filename) {
    FILE *output_file = fopen(filename, "w");
    if (output_file == NULL) {
        fprintf(stderr, "Error: Cannot open %s for writing\n", filename);
        return;
    }
    fprintf(output_file, "Inventory Report\n");
    fprintf(output_file, "Generated: %s\n", ctime(&(time_t){time(NULL)}));
    fprintf(output_file, "Total Products: %d\n", inv->total_products);
    fprintf(output_file, "Total Value: $%.2f\n", compute_inventory_value(inv));
    fprintf(output_file, "Total Revenue: $%.2f\n\n", inv->total_revenue);
    
    product_t *p = inv->head_product;
    while (p != NULL) {
        fprintf(output_file, "ID:%d|Name:%s|Category:%s|Price:%.2f|Stock:%d|Sold:%d\n",
                p->product_id, p->product_name, category_labels[p->category],
                p->unit_price, p->quantity_in_stock, p->units_sold);
        p = p->next_item;
    }
    fclose(output_file);
    printf("Inventory saved to %s\n", filename);
}

static void free_inventory(inventory_t *inv) {
    product_t *current = inv->head_product;
    while (current != NULL) {
        product_t *next_node = current->next_item;
        free(current);
        current = next_node;
    }
    inv->head_product = NULL;
    inv->total_products = 0;
}

int main(void) {
    inventory_t store_inventory = {NULL, 0, 0.0};
    
    insert_product(&store_inventory, create_product(101, "Laptop Pro X", CAT_ELECTRONICS, 1299.99, 15));
    insert_product(&store_inventory, create_product(102, "Wireless Mouse", CAT_ELECTRONICS, 29.99, 50));
    insert_product(&store_inventory, create_product(103, "USB-C Hub", CAT_ELECTRONICS, 49.99, 30));
    insert_product(&store_inventory, create_product(201, "Winter Jacket", CAT_CLOTHING, 89.99, 25));
    insert_product(&store_inventory, create_product(202, "Running Shoes", CAT_CLOTHING, 119.99, 20));
    insert_product(&store_inventory, create_product(301, "Organic Pasta", CAT_FOOD, 4.99, 100));
    insert_product(&store_inventory, create_product(302, "Dark Chocolate", CAT_FOOD, 3.49, 75));
    insert_product(&store_inventory, create_product(401, "C Programming Guide", CAT_BOOKS, 54.99, 12));
    insert_product(&store_inventory, create_product(402, "Data Structures 101", CAT_BOOKS, 64.99, 8));
    insert_product(&store_inventory, create_product(501, "Desk Lamp LED", CAT_OTHER, 34.99, 40));
    
    display_inventory_summary(&store_inventory);
    print_all_products(&store_inventory);
    
    record_sale(&store_inventory, 101, 2);
    record_sale(&store_inventory, 301, 20);
    record_sale(&store_inventory, 401, 3);
    record_sale(&store_inventory, 201, 1);
    record_sale(&store_inventory, 302, 15);
    record_sale(&store_inventory, 102, 5);
    
    printf("\n--- After Sales ---\n");
    display_inventory_summary(&store_inventory);
    
    sort_products_by_price(&store_inventory.head_product);
    printf("\n--- Sorted by Price ---\n");
    print_all_products(&store_inventory);
    
    printf("\nRemoving product 501 (Desk Lamp LED)...\n");
    remove_product_by_id(&store_inventory, 501);
    display_inventory_summary(&store_inventory);
    
    int low_stock = count_low_stock_items(&store_inventory, DISCOUNT_THRESHOLD);
    printf("Products with stock below %d: %d\n", DISCOUNT_THRESHOLD, low_stock);
    
    save_inventory_to_file(&store_inventory, "inventory_report.txt");
    free_inventory(&store_inventory);
    
    printf("\nProgram completed successfully.\n");
    return 0;
}